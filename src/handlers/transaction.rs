use crate::client::RedisPool;
use crate::handlers::command::redis_value_to_json;
use crate::utils::encoding::encode_result;
use crate::utils::AppError;
use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::sleep;

pub async fn handle_transaction_internal(
    State(pool): State<RedisPool>,
    Json(body): Json<Value>,
    encoding_enabled: bool,
) -> Result<Json<Value>, AppError> {
    // Extract array of command arrays from body (same format as pipeline)
    // Upstash sends directly as array: [[...]], but we also support {"_json": [[...]]}
    let command_arrays = if body.is_array() {
        // Body is directly an array: [[...]]
        body.as_array().unwrap()
    } else {
        // Body has _json wrapper: {"_json": [[...]]}
        body.get("_json")
            .and_then(|v| v.as_array())
            .ok_or_else(|| {
                AppError::MalformedRequest(
                    "Invalid command array. Expected an array of string arrays at root."
                        .to_string(),
                )
            })?
    };

    // Validate all items are arrays
    for cmd_array in command_arrays {
        if !cmd_array.is_array() {
            return Err(AppError::MalformedRequest(
                "Invalid command array. Expected an array of string arrays at root.".to_string(),
            ));
        }
    }

    // Transactions need retry logic too, but we must retry the entire transaction
    let max_retry = pool.max_retry();
    let mut attempt = 1u32;

    loop {
        match pool.get_connection().await {
            Ok(mut conn) => {
                // Execute MULTI
                match redis::cmd("MULTI")
                    .query_async::<_, String>(&mut conn)
                    .await
                {
                    Ok(_) => {
                        // Execute all commands in transaction
                        let mut transaction_failed = false;
                        for cmd_array in command_arrays {
                            let cmd_args: Vec<String> = cmd_array
                                .as_array()
                                .unwrap()
                                .iter()
                                .map(|v| match v {
                                    Value::String(s) => s.clone(),
                                    Value::Number(n) => n.to_string(),
                                    Value::Bool(b) => b.to_string(),
                                    Value::Null => "".to_string(),
                                    _ => v.to_string(),
                                })
                                .collect();

                            if cmd_args.is_empty() {
                                continue;
                            }

                            let mut cmd = redis::cmd(&cmd_args[0]);
                            for arg in cmd_args.iter().skip(1) {
                                cmd.arg(arg);
                            }

                            match cmd.query_async::<_, String>(&mut conn).await {
                                Ok(_) => {}
                                Err(e) => {
                                    // Check if it's a connection error
                                    if matches!(e.kind(), redis::ErrorKind::IoError) {
                                        transaction_failed = true;
                                        break;
                                    }
                                    // For other errors during transaction, continue
                                }
                            }
                        }

                        if transaction_failed {
                            if max_retry == -1 || attempt < max_retry as u32 {
                                attempt += 1;
                                sleep(Duration::from_secs(1) * (attempt - 1)).await;
                                continue;
                            } else {
                                break;
                            }
                        }

                        // Execute EXEC
                        match redis::cmd("EXEC")
                            .query_async::<_, Vec<redis::Value>>(&mut conn)
                            .await
                        {
                            Ok(redis_values) => {
                                let responses: Vec<Value> = redis_values
                                    .into_iter()
                                    .map(|v| {
                                        let json_value = redis_value_to_json(v);
                                        json!({ "result": json_value })
                                    })
                                    .collect();

                                let response = Value::Array(responses);
                                let encoded = encode_result(&response, encoding_enabled);
                                return Ok(Json(encoded));
                            }
                            Err(e) => {
                                // Check if it's a connection error
                                if matches!(e.kind(), redis::ErrorKind::IoError) {
                                    if max_retry == -1 || attempt < max_retry as u32 {
                                        attempt += 1;
                                        sleep(Duration::from_secs(1) * (attempt - 1)).await;
                                        continue;
                                    } else {
                                        break;
                                    }
                                }
                                let error_msg = e.to_string();
                                let response = json!({ "error": error_msg });
                                return Ok(Json(response));
                            }
                        }
                    }
                    Err(e) => {
                        // Check if it's a connection error
                        if matches!(e.kind(), redis::ErrorKind::IoError) {
                            if max_retry == -1 || attempt < max_retry as u32 {
                                attempt += 1;
                                sleep(Duration::from_secs(1) * (attempt - 1)).await;
                                continue;
                            } else {
                                break;
                            }
                        }
                        let error_msg = AppError::Redis(e).to_string();
                        let response = json!({ "error": error_msg });
                        return Ok(Json(response));
                    }
                }
            }
            Err(e) => {
                // Connection error, retry
                if matches!(e.kind(), redis::ErrorKind::IoError) {
                    if max_retry == -1 || attempt < max_retry as u32 {
                        attempt += 1;
                        sleep(Duration::from_secs(1) * (attempt - 1)).await;
                        continue;
                    } else {
                        break;
                    }
                }
                let error_msg = AppError::Redis(e).to_string();
                let response = json!({ "error": error_msg });
                return Ok(Json(response));
            }
        }
    }

    // Fallback error
    let response = json!({ "error": "Transaction failed after retries" });
    Ok(Json(response))
}

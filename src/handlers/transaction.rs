use crate::encoding::encode_result;
use crate::errors::AppError;
use crate::handlers::command::redis_value_to_json;
use crate::redis_client::RedisPool;
use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};

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

    let mut conn = pool.get_connection().await.map_err(AppError::Redis)?;

    // Execute MULTI
    let multi_result: Result<String, redis::RedisError> =
        redis::cmd("MULTI").query_async(&mut conn).await;

    match multi_result {
        Ok(_) => {
            // Execute all commands in transaction
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

                let _: String = cmd.query_async(&mut conn).await.map_err(AppError::Redis)?;
            }

            // Execute EXEC
            let exec_result: Result<Vec<redis::Value>, redis::RedisError> =
                redis::cmd("EXEC").query_async(&mut conn).await;

            match exec_result {
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
                    Ok(Json(encoded))
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    let response = json!({ "error": error_msg });
                    Ok(Json(response))
                }
            }
        }
        Err(e) => {
            let error_msg = AppError::Redis(e).to_string();
            let response = json!({ "error": error_msg });
            Ok(Json(response))
        }
    }
}

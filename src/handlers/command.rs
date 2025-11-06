use crate::encoding::encode_result;
use crate::errors::AppError;
use crate::redis_client::RedisPool;
use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};

pub async fn handle_command_internal(
    State(pool): State<RedisPool>,
    Json(body): Json<Value>,
    encoding_enabled: bool,
) -> Result<Json<Value>, AppError> {
    // Extract command array from body
    // Upstash sends [["command", "arg1"]] format (array of arrays), but we also support ["command", "arg1"] format
    // Also support direct array: [["command", "arg1"]] or {"_json": [["command", "arg1"]]}
    let json_array = if body.is_array() {
        // Body is directly an array: [["command", "arg1"]]
        body.as_array().unwrap()
    } else {
        // Body has _json wrapper: {"_json": [["command", "arg1"]]}
        body
            .get("_json")
            .and_then(|v| v.as_array())
            .ok_or_else(|| AppError::MalformedRequest(
                "Invalid command array. Expected a string array at root of the command and its arguments.".to_string()
            ))?
    };

    // Check if it's an array of arrays (Upstash format) or a simple array
    let command_array = if !json_array.is_empty() && json_array[0].is_array() {
        // It's an array of arrays: [["command", "arg1"]]
        json_array[0].as_array().unwrap()
    } else {
        // It's a simple array: ["command", "arg1"]
        json_array
    };

    // Convert JSON array to Vec<String>
    // Handle both strings and numbers (e.g., LRANGE takes numeric indices)
    let cmd_args: Vec<String> = command_array
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
        return Err(AppError::MalformedRequest(
            "Command array cannot be empty".to_string(),
        ));
    }

    // Build Redis command
    let mut cmd = redis::cmd(&cmd_args[0]);
    for arg in cmd_args.iter().skip(1) {
        cmd.arg(arg);
    }

    // Execute command
    let result = pool.execute_command(cmd).await.map_err(AppError::Redis);

    match result {
        Ok(redis_value) => {
            let json_value = redis_value_to_json(redis_value);
            let response = json!({ "result": json_value });
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

pub(crate) fn redis_value_to_json(value: redis::Value) -> Value {
    match value {
        redis::Value::Nil => Value::Null,
        redis::Value::Int(i) => Value::Number(i.into()),
        redis::Value::Data(bytes) => {
            // Try to decode as UTF-8 string, otherwise return as base64
            String::from_utf8(bytes.clone())
                .map(Value::String)
                .unwrap_or_else(|_| {
                    use base64::{engine::general_purpose, Engine as _};
                    Value::String(general_purpose::STANDARD.encode(&bytes))
                })
        }
        redis::Value::Bulk(values) => {
            Value::Array(values.into_iter().map(redis_value_to_json).collect())
        }
        redis::Value::Status(s) => Value::String(s),
        redis::Value::Okay => Value::String("OK".to_string()),
    }
}

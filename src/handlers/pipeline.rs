use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};
use crate::encoding::encode_result;
use crate::errors::AppError;
use crate::redis_client::RedisPool;
use crate::auth::check_encoding_header;
use crate::handlers::command::redis_value_to_json;

pub async fn handle_pipeline(
    State(pool): State<RedisPool>,
    request: axum::extract::Request,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let encoding_enabled = check_encoding_header(&request);
    handle_pipeline_internal(State(pool), Json(body), encoding_enabled).await
}

pub async fn handle_pipeline_internal(
    State(pool): State<RedisPool>,
    Json(body): Json<Value>,
    encoding_enabled: bool,
) -> Result<Json<Value>, AppError> {
    
    // Extract array of command arrays from body
    // Upstash sends directly as array: [[...]], but we also support {"_json": [[...]]}
    let command_arrays = if body.is_array() {
        // Body is directly an array: [[...]]
        body.as_array().unwrap()
    } else {
        // Body has _json wrapper: {"_json": [[...]]}
        body
            .get("_json")
            .and_then(|v| v.as_array())
            .ok_or_else(|| AppError::MalformedRequest(
                "Invalid command array. Expected an array of string arrays at root.".to_string()
            ))?
    };
    
    // Validate all items are arrays
    for cmd_array in command_arrays {
        if !cmd_array.is_array() {
            return Err(AppError::MalformedRequest(
                "Invalid command array. Expected an array of string arrays at root.".to_string()
            ));
        }
    }
    
    // Handle empty pipeline
    if command_arrays.is_empty() {
        let response = Value::Array(vec![]);
        let encoded = encode_result(&response, encoding_enabled);
        return Ok(Json(encoded));
    }
    
    // Build pipeline
    let mut pipeline = redis::Pipeline::new();
    let mut has_commands = false;
    
    for cmd_array in command_arrays {
        let cmd_args: Vec<String> = cmd_array
            .as_array()
            .unwrap()
            .iter()
            .map(|v| {
                match v {
                    Value::String(s) => s.clone(),
                    Value::Number(n) => n.to_string(),
                    Value::Bool(b) => b.to_string(),
                    Value::Null => "".to_string(),
                    _ => v.to_string(),
                }
            })
            .collect();
        
        if cmd_args.is_empty() {
            continue;
        }
        
        // Special handling for commands with no arguments
        if cmd_args.len() == 1 {
            let cmd_name = cmd_args[0].to_uppercase();
            if cmd_name == "MGET" {
                // MGET with no arguments returns empty array
                let empty_array = Value::Array(vec![]);
                let encoded_empty = encode_result(&empty_array, encoding_enabled);
                let response = json!([{ "result": encoded_empty }]);
                return Ok(Json(response));
            } else if cmd_name == "DEL" {
                // DEL with no arguments returns 0 (no keys deleted)
                let zero = Value::Number(0.into());
                let encoded_zero = encode_result(&zero, encoding_enabled);
                let response = json!([{ "result": encoded_zero }]);
                return Ok(Json(response));
            }
            // Other commands with no args - execute normally (Redis will handle it)
        }
        
        let mut cmd = redis::cmd(&cmd_args[0]);
        for arg in cmd_args.iter().skip(1) {
            cmd.arg(arg);
        }
        pipeline.add_command(cmd);
        has_commands = true;
    }
    
    // If no commands were added (all were empty), return empty array
    if !has_commands {
        let response = Value::Array(vec![]);
        let encoded = encode_result(&response, encoding_enabled);
        return Ok(Json(encoded));
    }
    
    // Execute pipeline
    let results = pool.execute_pipeline(&mut pipeline).await
        .map_err(|e| AppError::Redis(e));
    
    match results {
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


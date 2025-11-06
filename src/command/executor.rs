use crate::error::AppError;
use crate::command::registry::CommandRegistry;
use redis::aio::ConnectionManager;
use redis::Value as RedisValue;
use std::sync::Arc;

pub struct CommandExecutor {
    registry: Arc<CommandRegistry>,
}

impl CommandExecutor {
    pub fn new() -> Self {
        Self {
            registry: Arc::new(CommandRegistry::new()),
        }
    }
    
    pub async fn execute(
        &self,
        mut conn: ConnectionManager,
        command: &str,
        args: Vec<String>,
    ) -> Result<serde_json::Value, AppError> {
        let command_upper = command.to_uppercase();
        
        if !self.registry.is_supported(&command_upper) {
            return Err(AppError::CommandError(format!(
                "ERR unknown command '{}'",
                command
            )));
        }
        
        // Convert command and args to Redis command format
        let mut cmd = redis::cmd(&command_upper);
        for arg in args {
            cmd.arg(arg);
        }
        
        let redis_value: redis::Value = cmd.query_async(&mut conn).await?;
        
        let json_value = Self::redis_value_to_json(redis_value);
        
        Ok(json_value)
    }
    
    pub async fn execute_transaction(
        &self,
        mut conn: ConnectionManager,
        commands: Vec<Vec<String>>,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        // Validate all commands
        let mut validated_commands = Vec::new();
        for command_vec in commands {
            if command_vec.is_empty() {
                return Err(AppError::CommandError("Empty command in transaction".to_string()));
            }
            
            let command = command_vec[0].clone();
            let command_upper = command.to_uppercase();
            
            if !self.registry.is_supported(&command_upper) {
                return Err(AppError::CommandError(format!(
                    "ERR unknown command '{}'",
                    command
                )));
            }
            
            let args = command_vec[1..].to_vec();
            validated_commands.push((command_upper, args));
        }
        
        // Start MULTI
        redis::cmd("MULTI").query_async::<_, redis::Value>(&mut conn).await?;
        
        // Queue all commands
        for (command, args) in validated_commands {
            let mut cmd = redis::cmd(&command);
            for arg in args {
                cmd.arg(arg);
            }
            cmd.query_async::<_, redis::Value>(&mut conn).await?;
        }
        
        // Execute and get results
        let redis_results: Vec<redis::Value> = redis::cmd("EXEC").query_async(&mut conn).await?;
        
        // Convert to JSON
        let json_results: Vec<serde_json::Value> = redis_results
            .into_iter()
            .map(|v| Self::redis_value_to_json(v))
            .collect();
        
        Ok(json_results)
    }
    
    fn redis_value_to_json(value: RedisValue) -> serde_json::Value {
        match value {
            RedisValue::Nil => serde_json::Value::Null,
            RedisValue::Int(i) => serde_json::Value::Number(i.into()),
            RedisValue::Data(data) => {
                // Always try UTF-8 first, but if it fails, the data will be base64 encoded
                // by the encode_response_value function when base64 encoding is requested
                match String::from_utf8(data.clone()) {
                    Ok(s) => serde_json::Value::String(s),
                    Err(_) => {
                        // For binary data, we need to encode it as base64
                        // But we'll do this in encode_response_value based on the header
                        // For now, try to convert lossily to UTF-8
                        String::from_utf8_lossy(&data).to_string().into()
                    }
                }
            }
            RedisValue::Bulk(values) => {
                let json_array: Vec<serde_json::Value> = values
                    .into_iter()
                    .map(|v| Self::redis_value_to_json(v))
                    .collect();
                serde_json::Value::Array(json_array)
            }
            RedisValue::Status(s) => serde_json::Value::String(s),
            RedisValue::Okay => serde_json::Value::String("OK".to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_redis_value_to_json() {
        let redis_value = RedisValue::Status("OK".to_string());
        let json = CommandExecutor::redis_value_to_json(redis_value);
        assert_eq!(json, serde_json::json!("OK"));
        
        let redis_value = RedisValue::Nil;
        let json = CommandExecutor::redis_value_to_json(redis_value);
        assert!(json.is_null());
        
        let redis_value = RedisValue::Int(42);
        let json = CommandExecutor::redis_value_to_json(redis_value);
        assert_eq!(json, serde_json::json!(42));
        
        let redis_value = RedisValue::Okay;
        let json = CommandExecutor::redis_value_to_json(redis_value);
        assert_eq!(json, serde_json::json!("OK"));
        
        let redis_value = RedisValue::Bulk(vec![
            RedisValue::Data(b"val1".to_vec()),
            RedisValue::Nil,
            RedisValue::Int(42),
        ]);
        let json = CommandExecutor::redis_value_to_json(redis_value);
        assert!(json.is_array());
        let arr = json.as_array().unwrap();
        assert_eq!(arr.len(), 3);
        assert_eq!(arr[0], serde_json::json!("val1"));
        assert!(arr[1].is_null());
        assert_eq!(arr[2], serde_json::json!(42));
        
        let redis_value = RedisValue::Data(b"hello world".to_vec());
        let json = CommandExecutor::redis_value_to_json(redis_value);
        assert_eq!(json, serde_json::json!("hello world"));
    }
    
    #[test]
    fn test_command_registry_integration() {
        let registry = CommandRegistry::new();
        
        assert!(registry.is_supported("GET"));
        assert!(registry.is_supported("SET"));
        
        assert!(registry.is_supported("MSET"));
        assert!(registry.is_supported("APPEND"));
        assert!(registry.is_supported("STRLEN"));
        
        assert!(registry.is_supported("HSET"));
        assert!(registry.is_supported("HGET"));
        assert!(registry.is_supported("HGETALL"));
        
        assert!(registry.is_supported("LPUSH"));
        assert!(registry.is_supported("LRANGE"));
        
        assert!(registry.is_supported("SADD"));
        assert!(registry.is_supported("SMEMBERS"));
        
        assert!(registry.is_supported("ZADD"));
        assert!(registry.is_supported("ZRANGE"));
        
        assert!(registry.is_supported("EXISTS"));
        assert!(registry.is_supported("KEYS"));
    }
}

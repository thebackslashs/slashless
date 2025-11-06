use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct CommandRequest {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CommandResponse {
    pub result: Option<serde_json::Value>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl CommandResponse {
    pub fn success(result: Option<serde_json::Value>) -> Self {
        Self {
            result,
            error: None,
        }
    }
    
    pub fn error(error: String) -> Self {
        Self {
            result: None,
            error: Some(error),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub redis: String,
    pub version: String,
}

/// Pipeline request for batch command execution
/// Format: [["SET", "key", "value"], ["GET", "key"]]
pub type PipelineRequest = Vec<Vec<String>>;

/// Pipeline response containing array of CommandResponse
pub type PipelineResponse = Vec<CommandResponse>;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_command_request_deserialize() {
        let json = r#"{"command": "SET", "args": ["key", "value"]}"#;
        let request: CommandRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.command, "SET");
        assert_eq!(request.args, vec!["key", "value"]);
    }
    
    #[test]
    fn test_command_response_serialize() {
        let response = CommandResponse::success(Some(serde_json::json!("OK")));
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("OK"));
        assert!(!json.contains("error"));
    }
    
    #[test]
    fn test_command_response_error() {
        let response = CommandResponse::error("ERR test".to_string());
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("ERR test"));
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed["result"].is_null());
        assert!(parsed["error"].is_string());
    }
}

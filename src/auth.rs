use axum::extract::Request;
use crate::config::Config;
use crate::errors::AppError;

pub fn extract_bearer_token(request: &Request) -> Result<String, AppError> {
    let auth_header = request
        .headers()
        .get("authorization")
        .ok_or_else(|| AppError::MalformedRequest("Missing authorization header".to_string()))?;
    
    let auth_str = auth_header
        .to_str()
        .map_err(|_| AppError::MalformedRequest("Invalid authorization header".to_string()))?;
    
    if let Some(token) = auth_str.strip_prefix("Bearer ") {
        Ok(token.to_string())
    } else {
        Err(AppError::MalformedRequest("Invalid authorization header format. Expected 'Bearer <token>'".to_string()))
    }
}

pub fn validate_token(token: &str, config: &Config) -> Result<(), AppError> {
    if token == config.token {
        Ok(())
    } else {
        Err(AppError::Unauthorized)
    }
}

pub fn check_encoding_header(request: &Request) -> bool {
    if let Some(encoding_header) = request.headers().get("upstash-encoding") {
        if let Ok(encoding_str) = encoding_header.to_str() {
            return encoding_str == "base64";
        }
    }
    false
}


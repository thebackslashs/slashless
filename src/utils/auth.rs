use super::AppError;
use crate::config::Config;
use axum::extract::Request;

pub fn extract_bearer_token(request: &Request) -> Result<Option<String>, AppError> {
    let auth_header = request.headers().get("authorization");

    if auth_header.is_none() {
        return Ok(None);
    }

    let auth_str = auth_header
        .unwrap()
        .to_str()
        .map_err(|_| AppError::MalformedRequest("Invalid authorization header".to_string()))?;

    if let Some(token) = auth_str.strip_prefix("Bearer ") {
        Ok(Some(token.to_string()))
    } else {
        Err(AppError::MalformedRequest(
            "Invalid authorization header format. Expected 'Bearer <token>'".to_string(),
        ))
    }
}

pub fn validate_token(token: Option<&str>, config: &Config) -> Result<(), AppError> {
    // If no token is configured, skip authentication
    if config.token.is_empty() {
        return Ok(());
    }

    // If token is configured but not provided, deny access
    let provided_token = token.ok_or(AppError::Unauthorized)?;

    if provided_token == config.token {
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

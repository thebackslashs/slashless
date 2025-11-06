use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("Invalid token")]
    Unauthorized,

    #[error("Malformed request: {0}")]
    MalformedRequest(String),

    #[error("Connection error: {0}")]
    ConnectionError(String),

    #[error("Server error: {0}")]
    ServerError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Invalid token".to_string()),
            AppError::MalformedRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::ConnectionError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::ServerError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::Redis(err) => {
                // Redis errors are returned as 400 with error message
                let error_msg = err.to_string();
                (StatusCode::BAD_REQUEST, error_msg)
            }
        };

        let body = Json(json!({ "error": error_message }));
        (status, body).into_response()
    }
}

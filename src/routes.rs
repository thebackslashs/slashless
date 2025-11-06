use axum::{
    extract::{State, Request},
    routing::{get, post},
    Router,
    Json,
    body::Body,
};
use serde_json::json;
use crate::config::Config;
use crate::errors::AppError;
use crate::redis_client::RedisPool;
use crate::auth::{extract_bearer_token, validate_token, check_encoding_header};
use crate::handlers::{command, pipeline, transaction};

#[derive(Clone)]
pub struct AppState {
    pub pool: RedisPool,
    pub config: Config,
}

async fn root() -> Json<serde_json::Value> {
    Json(json!("Welcome to Serverless Redis HTTP!"))
}

async fn handle_command_with_auth(
    State(state): State<AppState>,
    request: Request<Body>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Extract and validate token
    let token = extract_bearer_token(&request)?;
    validate_token(&token, &state.config)?;
    
    // Check encoding header
    let encoding_enabled = check_encoding_header(&request);
    
    // Extract body
    let body_bytes = axum::body::to_bytes(request.into_body(), usize::MAX).await
        .map_err(|_| AppError::MalformedRequest("Failed to read request body".to_string()))?;
    let body: serde_json::Value = serde_json::from_slice(&body_bytes)
        .map_err(|_| AppError::MalformedRequest("Invalid JSON body".to_string()))?;
    
    command::handle_command_internal(State(state.pool), Json(body), encoding_enabled).await
}

async fn handle_pipeline_with_auth(
    State(state): State<AppState>,
    request: Request<Body>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Extract and validate token
    let token = extract_bearer_token(&request)?;
    validate_token(&token, &state.config)?;
    
    // Check encoding header
    let encoding_enabled = check_encoding_header(&request);
    
    // Extract body
    let body_bytes = axum::body::to_bytes(request.into_body(), usize::MAX).await
        .map_err(|_| AppError::MalformedRequest("Failed to read request body".to_string()))?;
    let body: serde_json::Value = serde_json::from_slice(&body_bytes)
        .map_err(|_| AppError::MalformedRequest("Invalid JSON body".to_string()))?;
    
    pipeline::handle_pipeline_internal(State(state.pool), Json(body), encoding_enabled).await
}

async fn handle_transaction_with_auth(
    State(state): State<AppState>,
    request: Request<Body>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Extract and validate token
    let token = extract_bearer_token(&request)?;
    validate_token(&token, &state.config)?;
    
    // Check encoding header
    let encoding_enabled = check_encoding_header(&request);
    
    // Extract body
    let body_bytes = axum::body::to_bytes(request.into_body(), usize::MAX).await
        .map_err(|_| AppError::MalformedRequest("Failed to read request body".to_string()))?;
    let body: serde_json::Value = serde_json::from_slice(&body_bytes)
        .map_err(|_| AppError::MalformedRequest("Invalid JSON body".to_string()))?;
    
    transaction::handle_transaction_internal(State(state.pool), Json(body), encoding_enabled).await
}

pub fn create_router(pool: RedisPool, config: Config) -> Router {
    Router::new()
        .route("/", get(root))
        .route("/", post(handle_command_with_auth))
        .route("/pipeline", post(handle_pipeline_with_auth))
        .route("/multi-exec", post(handle_transaction_with_auth))
        .with_state(AppState { pool, config })
}

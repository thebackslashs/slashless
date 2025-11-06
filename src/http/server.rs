use crate::config::Config;
use crate::utils::AppError;
use axum::Router;
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer};

#[allow(dead_code)]
pub async fn start_server(router: Router, config: &Config) -> Result<(), AppError> {
    let addr = config.server_address();
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| AppError::ServerError(format!("Failed to bind to {}: {}", addr, e)))?;

    let app = router
        .layer(CorsLayer::permissive())
        .layer(RequestBodyLimitLayer::new(10 * 1024 * 1024)); // 10MB limit

    axum::serve(listener, app)
        .await
        .map_err(|e| AppError::ServerError(format!("Server error: {}", e)))?;

    Ok(())
}

pub async fn bind_server(config: &Config) -> Result<TcpListener, AppError> {
    let addr = config.server_address();
    TcpListener::bind(&addr)
        .await
        .map_err(|e| AppError::ServerError(format!("Failed to bind to {}: {}", addr, e)))
}

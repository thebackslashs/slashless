use crate::config::Config;
use crate::errors::AppError;
use axum::Router;
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer};

pub async fn start_server(router: Router, config: &Config) -> Result<(), AppError> {
    let addr = config.server_address();
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| AppError::ServerError(format!("Failed to bind to {}: {}", addr, e)))?;

    tracing::info!("Server listening on {}", addr);

    let app = router
        .layer(CorsLayer::permissive())
        .layer(RequestBodyLimitLayer::new(10 * 1024 * 1024)); // 10MB limit

    axum::serve(listener, app)
        .await
        .map_err(|e| AppError::ServerError(format!("Server error: {}", e)))?;

    Ok(())
}

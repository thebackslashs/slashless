mod auth;
mod config;
mod encoding;
mod errors;
mod handlers;
mod redis_client;
mod routes;
mod server;

use config::Config;
use errors::AppError;
use redis_client::RedisPool;
use routes::create_router;
use server::start_server;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

const VERSION: &str = env!("CARGO_PKG_VERSION");

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing subscriber with custom format
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .with_thread_ids(false)
                .with_thread_names(false)
                .with_line_number(false)
                .with_file(false),
        )
        .init();

    // Load configuration
    let config = Config::from_env().map_err(|e| {
        eprintln!("Configuration error: {}", e);
        e
    })?;

    // Print startup banner
    tracing::info!("Starting stashless v{}", VERSION);
    tracing::info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    tracing::info!("Configuration:");
    tracing::info!(
        "  Redis URL: redis://{}:{}",
        config.redis_host,
        config.redis_port
    );
    tracing::info!("  Redis Password: not set");
    tracing::info!("  Bearer Token: {}", config.masked_token());
    tracing::info!("  Max Connections: {}", config.max_connections);
    tracing::info!("  Server Address: {}", config.server_address());
    tracing::info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Initialize Redis connection pool
    tracing::info!("Connecting to Redis at {}...", config.redis_url());
    let pool = RedisPool::new(&config).await.map_err(|e| {
        let msg = format!("Failed to connect to Redis: {}", e);
        tracing::error!("{}", msg);
        AppError::ConnectionError(msg)
    })?;

    tracing::info!(
        "Redis connection pool initialized with {} max connections",
        config.max_connections
    );

    // Create router
    let router = create_router(pool, config.clone());

    // Start server
    start_server(router, &config).await?;

    Ok(())
}

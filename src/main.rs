mod client;
mod config;
mod console;
mod handlers;
mod http;
mod utils;

use client::RedisPool;
use config::Config;
use http::routes::create_router;
use http::server::bind_server;
use std::sync::Arc;
use tracing_subscriber::{
    fmt::format::{DefaultFields, Format},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};
use utils::AppError;

const VERSION: &str = env!("CARGO_PKG_VERSION");

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing subscriber
    let format = Format::default()
        .with_target(false)
        .with_thread_ids(false)
        .with_thread_names(false)
        .with_line_number(false)
        .with_file(false)
        .with_timer(tracing_subscriber::fmt::time::SystemTime);

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(
            tracing_subscriber::fmt::layer()
                .event_format(format)
                .fmt_fields(DefaultFields::new()),
        )
        .init();

    // Load configuration first to get console mode
    let config = match Config::from_env() {
        Ok(config) => config,
        Err(e) => {
            eprintln!("Configuration error: {}", e);
            eprintln!("Please set SLASHLESS_TOKEN environment variable");
            std::process::exit(1);
        }
    };

    // Create console with initial state (banner is integrated in console)
    // Console::new now returns both the console and an optional shutdown receiver
    let (console, shutdown_receiver) = console::Console::new(
        config.server_address(),
        format!("{}:{}", config.redis_host, config.redis_port),
        config.max_connections,
        config.max_retry,
        VERSION.to_string(),
        config.console_mode.clone(),
    )
    .map_err(|e| format!("Failed to initialize console: {}", e))?;

    // Initial render
    console.update_server_status(console::Status::Starting)?;
    console.update_redis_status(console::Status::Establishing)?;
    console.log_info("Initializing server".to_string())?;

    // Bind server (with error handling)
    let listener = match bind_server(&config).await {
        Ok(listener) => {
            console.update_server_status(console::Status::Ready)?;
            console.log_info(format!("Server bound to {}", config.server_address()))?;
            listener
        }
        Err(e) => {
            console.update_server_status(console::Status::BindError)?;
            let error_msg = e.to_string();
            console.log_error(format!("Failed to bind to server: {}", error_msg.clone()))?;
            let _ = console.cleanup();
            std::process::exit(1);
        }
    };

    // Initialize Redis connection pool (with error handling)
    console.log_info(format!(
        "Connecting to Redis at {}:{}",
        config.redis_host, config.redis_port
    ))?;

    // Console is now Clone-safe (uses channel internally)
    let console_arc = Arc::new(console.clone());
    let pool = match RedisPool::new_with_console(&config, Some(console_arc.clone())).await {
        Ok(pool) => {
            let _ = console.update_redis_status(console::Status::Connected);
            let _ = console.log_info("Redis connection established".to_string());
            pool
        }
        Err(e) => {
            let _ = console.update_redis_status(console::Status::ConnectionError);
            let error_msg = format!("Failed to connect to Redis: {}", e);
            let _ = console.log_error(error_msg);
            let _ = console.cleanup();
            std::process::exit(1);
        }
    };

    // Create router
    let router = create_router(pool.clone(), config.clone());
    let _ = console.log_info("Router created".to_string());

    // Start Redis healthcheck task - ping every 2 seconds
    let pool_for_healthcheck = pool.clone();
    let console_for_healthcheck = console.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(2)); // 2 seconds
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        loop {
            interval.tick().await;

            // Ping Redis with retry (max 3 attempts)
            match pool_for_healthcheck.ping_with_retry().await {
                Ok(pong) => {
                    tracing::debug!("Redis PING successful: {}", pong);
                    // Connection is OK, no need to log every time
                }
                Err(e) => {
                    // All retry attempts failed - connection is lost
                    tracing::error!("Redis healthcheck failed after all retries: {}", e);
                    if let Err(log_err) = console_for_healthcheck
                        .log_error(format!("Redis healthcheck failed: {}", e))
                    {
                        tracing::error!("Failed to log healthcheck error: {}", log_err);
                    }
                }
            }
        }
    });

    // Start serving (this will block until server stops)
    let _ = console.log_info("Starting HTTP server".to_string());
    let app = router
        .layer(tower_http::cors::CorsLayer::permissive())
        .layer(tower_http::limit::RequestBodyLimitLayer::new(
            10 * 1024 * 1024,
        ));

    // Handle shutdown signal
    let console_for_shutdown = console.clone();
    let shutdown_signal: std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>> =
        match config.console_mode {
            config::ConsoleMode::Rich => {
                // In rich mode, wait for Ctrl+C from the console's keyboard input handler
                if let Some(mut receiver) = shutdown_receiver {
                    Box::pin(async move {
                        // Wait for Ctrl+C signal from the console thread
                        // The console thread will detect Ctrl+C and send a signal
                        let _ = receiver.recv().await;
                        // Cleanup the terminal when shutdown is triggered (this clears the screen)
                        let _ = console_for_shutdown.cleanup();
                        // Message is displayed after cleanup clears the screen
                        println!("Shutting down gracefully...");
                    })
                } else {
                    // This should never happen, but handle it gracefully
                    Box::pin(async move {
                        tokio::signal::ctrl_c()
                            .await
                            .expect("Failed to install Ctrl+C handler");
                        // Cleanup the terminal when shutdown is triggered (this clears the screen)
                        let _ = console_for_shutdown.cleanup();
                        // Message is displayed after cleanup clears the screen
                        println!("Shutting down gracefully...");
                    })
                }
            }
            config::ConsoleMode::Standard => {
                // In standard mode, use standard tokio signal
                Box::pin(async move {
                    tokio::signal::ctrl_c()
                        .await
                        .expect("Failed to install Ctrl+C handler");
                    let _ =
                        console_for_shutdown.log_warn("Shutting down gracefully...".to_string());
                    let _ = console_for_shutdown.cleanup();
                })
            }
        };

    // Start server with graceful shutdown
    let server_result = axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal)
        .await
        .map_err(|e| {
            let _ = console.log_error(format!("Server error: {}", e));
            AppError::ServerError(format!("Server error: {}", e))
        });

    // Always cleanup console to restore terminal state
    if matches!(config.console_mode, config::ConsoleMode::Rich) {
        let _ = console.cleanup();
    }

    server_result?;

    Ok(())
}

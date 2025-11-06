use clap::Parser;
use console::style;

#[derive(Parser)]
#[command(name = "stashless")]
#[command(about = "Redis-over-HTTP adapter compatible with Upstash SDK")]
#[command(version)]
pub struct Cli {
    /// Perform health check by calling the server's /health endpoint
    #[arg(long)]
    pub healthcheck: bool,

    /// Use boring mode (simple logs) instead of rich TUI
    #[arg(long)]
    pub boring: bool,
}

pub async fn handle_healthcheck() -> Result<(), String> {
    // Get configuration from environment (for host, port, and token)
    let host = std::env::var("SLASHLESS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("SLASHLESS_PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .map_err(|_| "Invalid SLASHLESS_PORT".to_string())?;
    let token = std::env::var("SLASHLESS_TOKEN")
        .map_err(|_| "SLASHLESS_TOKEN is required for healthcheck".to_string())?;

    let url = format!("http://{}:{}/health", host, port);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Health check failed: {}", e))?;

    if response.status().is_success() {
        println!("{}", style("Health check passed").green().bold());
        Ok(())
    } else {
        Err(format!(
            "Health check failed with status: {}",
            response.status()
        ))
    }
}

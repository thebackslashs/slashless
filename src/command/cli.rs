use clap::{Parser, Subcommand};
use console::{style, Emoji};
use crate::config::Config;
use crate::redis_client::RedisClientWrapper;
use crate::command::executor::CommandExecutor;

#[derive(Parser)]
#[command(name = "stashless")]
#[command(about = "Redis-over-HTTP adapter compatible with Upstash SDK")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Check Redis connection
    CheckRedis,
    
    /// Start HTTP server
    Serve {
        /// Port to listen on (overrides SLASHLESS_PORT env var)
        #[arg(short, long)]
        port: Option<u16>,
    },
    
    /// Execute a Redis command from CLI
    Run {
        /// Redis command to execute (e.g., "SET foo bar")
        #[arg(short, long)]
        cmd: String,
    },
    
    /// Show current configuration
    Config,
    
    /// Generate a secure random bearer token
    GenerateToken,
    
    /// Validate configuration without starting server
    Validate,
    
    /// Show version information
    Version,
}

pub async fn handle_check_redis(config: &Config) -> Result<(), String> {
    println!("{}", style("Checking Redis connection...").bold());
    println!("{} {}", style("Redis URL:").cyan(), config.redis_url);
    
    let client = RedisClientWrapper::new(
        &config.redis_url,
        config.redis_password.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to connect to Redis: {}", e))?;
    
    let result = client.ping().await
        .map_err(|e| format!("Failed to ping Redis: {}", e))?;
    
    println!("{} {}", style("Redis connection successful!").green().bold(), Emoji("✓", ""));
    println!("{} {}", style("PING response:").cyan(), result);
    
    Ok(())
}

pub async fn handle_run_command(config: &Config, cmd: &str) -> Result<(), String> {
    println!("{} {}", style("Executing command:").bold(), style(cmd).cyan());
    
    let parts: Vec<&str> = cmd.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }
    
    let command = parts[0].to_uppercase();
    let args: Vec<String> = parts[1..].iter().map(|s| s.to_string()).collect();
    
    let client = RedisClientWrapper::new(
        &config.redis_url,
        config.redis_password.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to connect to Redis: {}", e))?;
    
    let executor = CommandExecutor::new();
    
    // Obtenir une connexion du client
    let conn = client.connection_manager.clone();
    
    match executor.execute(conn, &command, args).await {
        Ok(result) => {
            println!("{} {}", style("Result:").green().bold(), serde_json::to_string_pretty(&result)
                .unwrap_or_else(|_| format!("{:?}", result)));
            Ok(())
        }
        Err(e) => {
            eprintln!("{} {}", style("Error:").red().bold(), style(&e).red());
            Err(format!("{}", e))
        }
    }
}

pub fn handle_config(config: &Config) -> Result<(), String> {
    println!("{}", style("Current Configuration").bold().underlined());
    println!("{} {}", style("Redis URL:").cyan(), config.redis_url);
    println!("{} {}", style("Redis Password:").cyan(), 
        config.redis_password.as_ref()
            .map(|_| style("***").dim())
            .unwrap_or_else(|| style("not set").yellow())
    );
    println!("{} {}", style("Server Host:").cyan(), config.server_host);
    println!("{} {}", style("Server Port:").cyan(), config.server_port);
    println!("{} {}", style("Server Address:").cyan(), style(config.server_address()).bold());
    println!("{} {}", style("Bearer Token:").cyan(), 
        if config.bearer_token.len() > 8 {
            format!("{}...", &config.bearer_token[..8])
        } else {
            "***".to_string()
        }
    );
    Ok(())
}

pub fn handle_generate_token() -> Result<(), String> {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const TOKEN_LENGTH: usize = 32;
    
    let mut rng = rand::thread_rng();
    let token: String = (0..TOKEN_LENGTH)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect();
    
    println!("{}", style("Generated Bearer Token").bold().green());
    println!("{}", style(format!("SLASHLESS_BEARER_TOKEN={}", token)).bold());
    println!("\n{}", style("Add this to your .env file or export it:").dim());
    println!("   {}", style(format!("export SLASHLESS_BEARER_TOKEN={}", token)).cyan());
    
    Ok(())
}

pub async fn handle_validate(config: &Config) -> Result<(), String> {
    println!("{}", style("Validating configuration...").bold());
    
    println!("{}", style("Checking Redis connection...").cyan());
    match RedisClientWrapper::new(
        &config.redis_url,
        config.redis_password.as_deref(),
    )
    .await
    {
        Ok(client) => {
            match client.ping().await {
                Ok(_) => println!("  {} {}", style("Redis connection:").cyan(), style("OK").green().bold()),
                Err(e) => {
                    eprintln!("  {} {}", style("Redis connection:").cyan(), style(format!("FAILED - {}", e)).red().bold());
                    return Err(format!("Redis validation failed: {}", e));
                }
            }
        }
        Err(e) => {
            eprintln!("  {} {}", style("Redis connection:").cyan(), style(format!("FAILED - {}", e)).red().bold());
            return Err(format!("Redis validation failed: {}", e));
        }
    }
    
    println!("{}", style("Validating configuration values...").cyan());
    
    if config.bearer_token.is_empty() {
        return Err("Bearer token cannot be empty".to_string());
    }
    println!("  {} {}", style("Bearer token:").cyan(), style("OK").green().bold());
    
    if config.server_port == 0 {
        return Err(format!("Invalid server port: {}", config.server_port));
    }
    println!("  {} {}", style("Server port:").cyan(), style("OK").green().bold());
    
    if config.server_host.is_empty() {
        return Err("Server host cannot be empty".to_string());
    }
    println!("  {} {}", style("Server host:").cyan(), style("OK").green().bold());
    
    println!("\n{}", style("Configuration is valid!").green().bold());
    Ok(())
}

pub fn handle_version() -> Result<(), String> {
    println!("{} {}", style("Stashless").bold().cyan(), style(env!("CARGO_PKG_VERSION")).bold());
    println!("{}", style("Redis-over-HTTP adapter compatible with Upstash SDK").dim());
    Ok(())
}


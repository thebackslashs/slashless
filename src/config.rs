use std::env;

#[derive(Debug, Clone)]
pub enum ConsoleMode {
    Rich,
    Standard,
}

impl ConsoleMode {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "standard" => ConsoleMode::Standard,
            "rich" => ConsoleMode::Rich,
            _ => ConsoleMode::Standard,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Config {
    pub redis_host: String,
    pub redis_port: u16,
    pub host: String,
    pub port: u16,
    pub token: String,
    pub max_connections: usize,
    pub max_retry: i32,
    pub console_mode: ConsoleMode,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let redis_host =
            env::var("SLASHLESS_REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

        let redis_port = env::var("SLASHLESS_REDIS_PORT")
            .unwrap_or_else(|_| "6379".to_string())
            .parse::<u16>()
            .map_err(|_| "SLASHLESS_REDIS_PORT must be a valid port number")?;

        let host = env::var("SLASHLESS_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

        let port = env::var("SLASHLESS_PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse::<u16>()
            .map_err(|_| "SLASHLESS_PORT must be a valid port number")?;

        let token = env::var("SLASHLESS_TOKEN").map_err(|_| "SLASHLESS_TOKEN is required")?;

        if token.is_empty() {
            return Err("SLASHLESS_TOKEN cannot be empty".to_string());
        }

        let max_connections = env::var("SLASHLESS_MAX_CONNECTION")
            .unwrap_or_else(|_| "3".to_string())
            .parse::<usize>()
            .map_err(|_| "SLASHLESS_MAX_CONNECTION must be a valid positive integer")?;

        if max_connections == 0 {
            return Err("SLASHLESS_MAX_CONNECTION must be greater than 0".to_string());
        }

        let console_mode = env::var("SLASHLESS_MODE").unwrap_or_else(|_| "standard".to_string());
        let console_mode = ConsoleMode::from_str(&console_mode);

        let max_retry = env::var("SLASHLESS_MAX_RETRY")
            .unwrap_or_else(|_| "-1".to_string())
            .parse::<i32>()
            .map_err(|_| "SLASHLESS_MAX_RETRY must be a valid integer")?;

        Ok(Self {
            redis_host,
            redis_port,
            host,
            port,
            token,
            max_connections,
            max_retry,
            console_mode,
        })
    }

    pub fn redis_url(&self) -> String {
        format!("redis://{}:{}", self.redis_host, self.redis_port)
    }

    pub fn server_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    #[allow(dead_code)]
    pub fn masked_token(&self) -> String {
        if self.token.len() <= 8 {
            format!("{}***", &self.token[..1.min(self.token.len())])
        } else {
            format!("{}***", &self.token[..8])
        }
    }
}

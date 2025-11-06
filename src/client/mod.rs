use crate::config::Config;
use crate::console::Console;
use redis::aio::ConnectionManager;
use redis::{Client, RedisError};
use std::sync::{
    atomic::{AtomicU32, Ordering},
    Arc,
};
use std::time::Duration;
use tokio::sync::Semaphore;
use tokio::time::sleep;

#[derive(Clone)]
pub struct RedisPool {
    client: Arc<Client>,
    semaphore: Arc<Semaphore>,
    console: Option<Arc<Console>>,
    max_retry: i32,
}

impl RedisPool {
    #[allow(dead_code)]
    pub async fn new(config: &Config) -> Result<Self, RedisError> {
        Self::new_with_console(config, None).await
    }

    pub async fn new_with_console(
        config: &Config,
        console: Option<Arc<Console>>,
    ) -> Result<Self, RedisError> {
        let url = config.redis_url();

        // Configure client with connection timeouts
        let client = Client::open(url)?;

        // Test connection
        let mut conn = client.get_connection_manager().await?;
        redis::cmd("PING")
            .query_async::<_, String>(&mut conn)
            .await?;

        Ok(Self {
            client: Arc::new(client),
            semaphore: Arc::new(Semaphore::new(config.max_connections)),
            console,
            max_retry: config.max_retry,
        })
    }

    /// Check if an error indicates a connection failure that requires reconnection
    fn is_connection_error(&self, error: &RedisError) -> bool {
        match error.kind() {
            redis::ErrorKind::IoError => true,
            redis::ErrorKind::ResponseError => {
                // Check if it's a connection-related response error
                let error_msg = error.to_string().to_lowercase();
                error_msg.contains("connection")
                    || error_msg.contains("broken pipe")
                    || error_msg.contains("connection reset")
                    || error_msg.contains("closed")
                    || error_msg.contains("connection refused")
            }
            _ => false,
        }
    }

    /// Log disconnection and update console status
    fn log_disconnection(&self, error: &str) {
        if let Some(console) = &self.console {
            let _ = console.log_warn(format!("Redis connection lost: {}", error));
            if let Err(e) = console.update_redis_status(crate::console::Status::Reconnecting) {
                let _ = console.log_error(format!("Failed to update console status: {}", e));
            }
        }
    }

    /// Log reconnection attempt
    fn log_reconnection_attempt(&self, attempt: u32) {
        if let Some(console) = &self.console {
            let _ = console.log_info(format!(
                "Attempting to reconnect to Redis (attempt {})",
                attempt
            ));
        }
    }

    /// Log connection attempt
    fn log_connection_attempt(&self, attempt: u32) {
        if let Some(console) = &self.console {
            let _ = console.log_debug(format!("Testing Redis connection (attempt {})", attempt));
        }
    }

    /// Log successful connection
    fn log_connection_success(&self) {
        if let Some(console) = &self.console {
            let _ = console.log_debug("Redis connection successful".to_string());
        }
    }

    /// Log successful reconnection and update console status
    fn log_reconnection_success(&self) {
        if let Some(console) = &self.console {
            let _ = console.log_info("Redis connection restored".to_string());
            if let Err(e) = console.update_redis_status(crate::console::Status::Connected) {
                let _ = console.log_error(format!("Failed to update console status: {}", e));
            }
        }
    }

    /// Log reconnection failure
    fn log_reconnection_failure(&self, error: &str) {
        if let Some(console) = &self.console {
            let _ = console.log_error(format!("Failed to reconnect to Redis: {}", error));
        }
    }

    /// Ping Redis with retry logic
    pub async fn ping_with_retry(&self) -> Result<String, RedisError> {
        const RETRY_DELAY: Duration = Duration::from_millis(500);

        let mut attempt = 1u32;
        loop {
            match self.get_connection().await {
                Ok(mut conn) => {
                    match redis::cmd("PING").query_async::<_, String>(&mut conn).await {
                        Ok(result) => {
                            // Success on retry - log reconnection
                            if attempt > 1 {
                                self.log_reconnection_success();
                            }
                            return Ok(result);
                        }
                        Err(e) => {
                            if self.is_connection_error(&e) {
                                let error_msg = e.to_string();
                                if attempt == 1 {
                                    self.log_disconnection(&error_msg);
                                }

                                if self.should_retry(attempt) {
                                    attempt += 1;
                                    self.log_reconnection_attempt(attempt);
                                    sleep(RETRY_DELAY).await;
                                    continue;
                                } else {
                                    self.log_reconnection_failure(&error_msg);
                                    return Err(e);
                                }
                            } else {
                                // Non-connection error, return immediately
                                return Err(e);
                            }
                        }
                    }
                }
                Err(e) => {
                    if self.is_connection_error(&e) {
                        let error_msg = e.to_string();
                        if attempt == 1 {
                            self.log_disconnection(&error_msg);
                        }

                        if self.should_retry(attempt) {
                            attempt += 1;
                            self.log_reconnection_attempt(attempt);
                            sleep(RETRY_DELAY).await;
                            continue;
                        } else {
                            self.log_reconnection_failure(&error_msg);
                            return Err(e);
                        }
                    } else {
                        return Err(e);
                    }
                }
            }
        }
    }

    /// Check if we should retry based on max_retry setting
    fn should_retry(&self, attempt: u32) -> bool {
        if self.max_retry == -1 {
            // Infinite retries
            true
        } else {
            attempt < self.max_retry as u32
        }
    }

    /// Get the maximum number of retries (-1 for infinite)
    pub fn max_retry(&self) -> i32 {
        self.max_retry
    }

    pub async fn get_connection(&self) -> Result<ConnectionManager, RedisError> {
        // Acquire permit from semaphore to limit concurrent connections
        let _permit = self.semaphore.acquire().await.map_err(|_| {
            RedisError::from((
                redis::ErrorKind::IoError,
                "Failed to acquire connection permit",
            ))
        })?;

        match self.client.get_connection_manager().await {
            Ok(conn) => {
                // Log to console occasionally to show activity (every 10th connection)
                static CONNECTION_COUNT: AtomicU32 = AtomicU32::new(0);
                let count = CONNECTION_COUNT.fetch_add(1, Ordering::Relaxed);
                if count.is_multiple_of(10) && count > 0 {
                    self.log_connection_success();
                }
                Ok(conn)
            }
            Err(e) => {
                // Check if it's a connection error and log it
                if self.is_connection_error(&e) {
                    self.log_disconnection(&e.to_string());
                }
                Err(e)
            }
        }
    }

    pub async fn execute_command<T: redis::FromRedisValue>(
        &self,
        cmd: redis::Cmd,
    ) -> Result<T, RedisError> {
        const RETRY_DELAY: Duration = Duration::from_secs(1);

        let mut attempt = 1u32;
        loop {
            // Log connection attempt (only for retries to avoid spam)
            if attempt > 1 {
                self.log_connection_attempt(attempt);
            }

            match self.get_connection().await {
                Ok(mut conn) => {
                    match cmd.query_async(&mut conn).await {
                        Ok(result) => {
                            // If we had retried, log success
                            if attempt > 1 {
                                self.log_reconnection_success();
                            }
                            return Ok(result);
                        }
                        Err(e) => {
                            if self.is_connection_error(&e) {
                                let error_msg = e.to_string();
                                if attempt == 1 {
                                    self.log_disconnection(&error_msg);
                                }

                                if self.should_retry(attempt) {
                                    attempt += 1;
                                    self.log_reconnection_attempt(attempt);
                                    sleep(RETRY_DELAY * (attempt - 1)).await;
                                    continue;
                                } else {
                                    self.log_reconnection_failure(&error_msg);
                                    return Err(e);
                                }
                            } else {
                                // Non-connection error, return immediately
                                return Err(e);
                            }
                        }
                    }
                }
                Err(e) => {
                    if self.is_connection_error(&e) {
                        let error_msg = e.to_string();
                        if attempt == 1 {
                            self.log_disconnection(&error_msg);
                        }

                        if self.should_retry(attempt) {
                            attempt += 1;
                            self.log_reconnection_attempt(attempt);
                            sleep(RETRY_DELAY * (attempt - 1)).await;
                            continue;
                        } else {
                            self.log_reconnection_failure(&error_msg);
                            return Err(e);
                        }
                    } else {
                        return Err(e);
                    }
                }
            }
        }
    }

    pub async fn execute_pipeline(
        &self,
        pipeline: &mut redis::Pipeline,
    ) -> Result<Vec<redis::Value>, RedisError> {
        const RETRY_DELAY: Duration = Duration::from_secs(1);

        let mut attempt = 1u32;
        loop {
            // Log connection attempt (only for retries to avoid spam)
            if attempt > 1 {
                self.log_connection_attempt(attempt);
            }

            match self.get_connection().await {
                Ok(mut conn) => {
                    match pipeline.query_async(&mut conn).await {
                        Ok(result) => {
                            // If we had retried, log success
                            if attempt > 1 {
                                self.log_reconnection_success();
                            }
                            return Ok(result);
                        }
                        Err(e) => {
                            if self.is_connection_error(&e) {
                                let error_msg = e.to_string();
                                if attempt == 1 {
                                    self.log_disconnection(&error_msg);
                                }

                                if self.should_retry(attempt) {
                                    attempt += 1;
                                    self.log_reconnection_attempt(attempt);
                                    sleep(RETRY_DELAY * (attempt - 1)).await;
                                    continue;
                                } else {
                                    self.log_reconnection_failure(&error_msg);
                                    return Err(e);
                                }
                            } else {
                                // Non-connection error, return immediately
                                return Err(e);
                            }
                        }
                    }
                }
                Err(e) => {
                    if self.is_connection_error(&e) {
                        let error_msg = e.to_string();
                        if attempt == 1 {
                            self.log_disconnection(&error_msg);
                        }

                        if self.should_retry(attempt) {
                            attempt += 1;
                            self.log_reconnection_attempt(attempt);
                            sleep(RETRY_DELAY * (attempt - 1)).await;
                            continue;
                        } else {
                            self.log_reconnection_failure(&error_msg);
                            return Err(e);
                        }
                    } else {
                        return Err(e);
                    }
                }
            }
        }
    }
}

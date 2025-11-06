use crate::config::Config;
use redis::aio::ConnectionManager;
use redis::{Client, RedisError};
use std::sync::Arc;
use tokio::sync::Semaphore;

#[derive(Clone)]
pub struct RedisPool {
    client: Arc<Client>,
    semaphore: Arc<Semaphore>,
}

impl RedisPool {
    pub async fn new(config: &Config) -> Result<Self, RedisError> {
        let url = config.redis_url();
        let client = Client::open(url)?;

        // Test connection
        let mut conn = client.get_connection_manager().await?;
        redis::cmd("PING")
            .query_async::<_, String>(&mut conn)
            .await?;

        Ok(Self {
            client: Arc::new(client),
            semaphore: Arc::new(Semaphore::new(config.max_connections)),
        })
    }

    pub async fn get_connection(&self) -> Result<ConnectionManager, RedisError> {
        // Acquire permit from semaphore to limit concurrent connections
        let _permit = self.semaphore.acquire().await.map_err(|_| {
            RedisError::from((
                redis::ErrorKind::IoError,
                "Failed to acquire connection permit",
            ))
        })?;

        self.client.get_connection_manager().await
    }

    pub async fn execute_command<T: redis::FromRedisValue>(
        &self,
        cmd: redis::Cmd,
    ) -> Result<T, RedisError> {
        let mut conn = self.get_connection().await?;
        cmd.query_async(&mut conn).await
    }

    pub async fn execute_pipeline(
        &self,
        pipeline: &mut redis::Pipeline,
    ) -> Result<Vec<redis::Value>, RedisError> {
        let mut conn = self.get_connection().await?;
        pipeline.query_async(&mut conn).await
    }
}

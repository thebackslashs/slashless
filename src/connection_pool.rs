use crate::error::AppError;
use crate::token_resolver::TokenConfig;
use dashmap::DashMap;
use redis::aio::ConnectionManager;
use redis::Client as RedisClient;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::interval;

pub struct ConnectionPool {
    connections: Arc<DashMap<usize, ConnectionManager>>,
    config: TokenConfig,
    current_index: AtomicUsize,
    last_used: Arc<tokio::sync::RwLock<Instant>>,
}

impl ConnectionPool {
    pub fn new(config: TokenConfig) -> Self {
        Self {
            connections: Arc::new(DashMap::new()),
            config,
            current_index: AtomicUsize::new(0),
            last_used: Arc::new(tokio::sync::RwLock::new(Instant::now())),
        }
    }
    
    async fn ensure_connections(&self) -> Result<(), AppError> {
        if !self.connections.is_empty() {
            // Mettre à jour le timestamp de dernière utilisation
            *self.last_used.write().await = Instant::now();
            return Ok(());
        }
        
        // Lazy initialization : créer les connexions à la première utilisation
        let max_conns = self.config.max_connections as usize;
        
        tracing::debug!("Creating {} connections for pool {}", max_conns, self.config.srh_id);
        
        for i in 0..max_conns {
            let connection = Self::create_connection(&self.config.connection_string).await?;
            self.connections.insert(i, connection);
        }
        
        *self.last_used.write().await = Instant::now();
        tracing::info!("Created {} connections for pool {}", max_conns, self.config.srh_id);
        
        Ok(())
    }
    
    async fn create_connection(connection_string: &str) -> Result<ConnectionManager, AppError> {
        let client = RedisClient::open(connection_string)
            .map_err(|e| AppError::RedisError(e))?;
        
        let connection_manager = ConnectionManager::new(client).await
            .map_err(|e| AppError::RedisError(e))?;
        
        Ok(connection_manager)
    }
    
    pub async fn borrow_connection(&self) -> Result<ConnectionManager, AppError> {
        self.ensure_connections().await?;
        
        // Round-robin pour distribuer les requêtes
        let index = self.current_index.fetch_add(1, Ordering::Relaxed);
        let pool_size = self.connections.len();
        
        if pool_size == 0 {
            return Err(AppError::ConfigError("No connections available".to_string()));
        }
        
        let actual_index = index % pool_size;
        
        // Mettre à jour le timestamp
        *self.last_used.write().await = Instant::now();
        
        // Obtenir la connexion (ConnectionManager implémente Clone)
        let connection = self.connections
            .get(&actual_index)
            .ok_or_else(|| AppError::ConfigError("Connection not found".to_string()))?
            .clone();
        
        Ok(connection)
    }
    
    pub async fn get_last_used(&self) -> Instant {
        *self.last_used.read().await
    }
    
    pub async fn destroy(&self) {
        tracing::debug!("Destroying pool {}", self.config.srh_id);
        self.connections.clear();
    }
    
    pub fn srh_id(&self) -> &str {
        &self.config.srh_id
    }
}

// Task de nettoyage des pools inactifs
pub async fn start_idle_cleanup_task(
    pools: Arc<DashMap<String, Arc<ConnectionPool>>>,
) {
    let mut interval = interval(Duration::from_secs(60)); // Vérifier toutes les minutes
    let idle_timeout = Duration::from_secs(15 * 60); // 15 minutes
    
    loop {
        interval.tick().await;
        
        let now = Instant::now();
        let mut to_remove = Vec::new();
        
        // Vérifier tous les pools
        for entry in pools.iter() {
            let last_used = entry.value().get_last_used().await;
            let elapsed = now.duration_since(last_used);
            
            if elapsed >= idle_timeout {
                tracing::info!("Pool {} has been idle for {:?}, destroying it", entry.key(), elapsed);
                to_remove.push(entry.key().clone());
            }
        }
        
        // Supprimer les pools inactifs
        for key in to_remove {
            if let Some((_, pool)) = pools.remove(&key) {
                pool.destroy().await;
            }
        }
    }
}


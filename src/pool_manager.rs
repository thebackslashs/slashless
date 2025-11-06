use crate::connection_pool::{ConnectionPool, start_idle_cleanup_task};
use crate::error::AppError;
use crate::token_resolver::TokenResolver;
use dashmap::DashMap;
use std::sync::Arc;
use tokio::task::JoinHandle;

pub struct PoolManager {
    pools: Arc<DashMap<String, Arc<ConnectionPool>>>,
    token_resolver: Arc<TokenResolver>,
    cleanup_handle: Option<JoinHandle<()>>,
}

impl PoolManager {
    pub fn new(token_resolver: Arc<TokenResolver>) -> Self {
        let pools = Arc::new(DashMap::new());
        
        // Démarrer la tâche de nettoyage des pools inactifs
        let pools_clone = pools.clone();
        let cleanup_handle = Some(tokio::spawn(async move {
            start_idle_cleanup_task(pools_clone).await;
        }));
        
        Self {
            pools,
            token_resolver,
            cleanup_handle,
        }
    }
    
    /// Lookup or start pattern : récupère un pool existant ou en crée un nouveau
    pub async fn lookup_or_start(&self, token: &str) -> Result<Arc<ConnectionPool>, AppError> {
        // Résoudre le token vers une configuration
        let token_config = self.token_resolver.resolve(token).await?;
        
        let srh_id = token_config.srh_id.clone();
        
        // Vérifier si le pool existe déjà
        if let Some(pool) = self.pools.get(&srh_id) {
            return Ok(pool.clone());
        }
        
        // Créer un nouveau pool (lazy initialization)
        let pool = Arc::new(ConnectionPool::new(token_config));
        
        // Insérer dans le registry (avec gestion de race condition)
        // Si un autre thread a créé le pool entre-temps, utiliser celui existant
        match self.pools.entry(srh_id.clone()) {
            dashmap::mapref::entry::Entry::Occupied(entry) => {
                Ok(entry.get().clone())
            }
            dashmap::mapref::entry::Entry::Vacant(entry) => {
                entry.insert(pool.clone());
                tracing::info!("Created new pool for srh_id: {}", srh_id);
                Ok(pool)
            }
        }
    }
    
    pub async fn get_pool(&self, srh_id: &str) -> Option<Arc<ConnectionPool>> {
        self.pools.get(srh_id).map(|entry| entry.clone())
    }
    
    pub async fn destroy_pool(&self, srh_id: &str) {
        if let Some((_, pool)) = self.pools.remove(srh_id) {
            pool.destroy().await;
            tracing::info!("Destroyed pool {}", srh_id);
        }
    }
}

impl Drop for PoolManager {
    fn drop(&mut self) {
        // Arrêter la tâche de nettoyage
        if let Some(handle) = self.cleanup_handle.take() {
            handle.abort();
        }
    }
}


use super::status::Status;

pub enum ConsoleCommand {
    UpdateServerStatus(Status),
    UpdateRedisStatus(Status),
}

pub struct ConsoleState {
    pub server_status: Status,
    pub redis_status: Status,
    pub server_address: String,
    pub redis_address: String,
    pub connections: usize,
    pub max_retry: i32,
    pub version: String,
}

impl ConsoleState {
    pub fn new(
        server_address: String,
        redis_address: String,
        connections: usize,
        max_retry: i32,
        version: String,
    ) -> Self {
        Self {
            server_status: Status::Starting,
            redis_status: Status::Establishing,
            server_address,
            redis_address,
            connections,
            max_retry,
            version,
        }
    }
}

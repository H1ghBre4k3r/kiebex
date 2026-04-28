use std::{env, net::SocketAddr, time::Duration};

use crate::error::AppError;

#[derive(Clone, Debug)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub database_url: String,
    pub database_max_connections: u32,
    pub database_connect_timeout: Duration,
}

impl Config {
    pub fn from_env() -> Result<Self, AppError> {
        let bind_addr = env::var("RUST_API_BIND_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:4000".to_owned())
            .parse()
            .map_err(|source| AppError::Config {
                key: "RUST_API_BIND_ADDR",
                source: Box::new(source),
            })?;

        let database_url = env::var("DATABASE_URL").map_err(|source| AppError::MissingConfig {
            key: "DATABASE_URL",
            source,
        })?;

        let database_max_connections = env::var("RUST_API_DATABASE_MAX_CONNECTIONS")
            .ok()
            .map(|value| value.parse())
            .transpose()
            .map_err(|source| AppError::Config {
                key: "RUST_API_DATABASE_MAX_CONNECTIONS",
                source: Box::new(source),
            })?
            .unwrap_or(10);

        Ok(Self {
            bind_addr,
            database_url,
            database_max_connections,
            database_connect_timeout: Duration::from_secs(5),
        })
    }
}

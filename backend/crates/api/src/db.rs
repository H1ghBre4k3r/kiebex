use sqlx::{PgPool, postgres::PgPoolOptions};

use crate::{config::Config, error::AppError};

pub async fn create_pool(config: &Config) -> Result<PgPool, AppError> {
    PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .acquire_timeout(config.database_connect_timeout)
        .connect(&config.database_url)
        .await
        .map_err(AppError::Database)
}

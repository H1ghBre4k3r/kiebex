use sqlx::PgPool;

use crate::{config::Config, observability::Metrics};

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub db: PgPool,
    pub metrics: Metrics,
}

impl AppState {
    pub fn new(config: Config, db: PgPool, metrics: Metrics) -> Self {
        Self {
            config,
            db,
            metrics,
        }
    }
}

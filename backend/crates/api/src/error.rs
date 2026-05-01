use axum::{http::StatusCode, response::IntoResponse};
use thiserror::Error;

use crate::http::json_error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("missing required configuration {key}")]
    MissingConfig {
        key: &'static str,
        source: std::env::VarError,
    },
    #[error("invalid configuration {key}")]
    Config {
        key: &'static str,
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("database error")]
    Database(#[from] sqlx::Error),
    #[error("metrics exporter error")]
    Metrics(#[from] metrics_exporter_prometheus::BuildError),
    #[error("I/O error")]
    Io(#[from] std::io::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        tracing::error!(error = %self, "request failed");

        json_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "An unexpected error occurred.",
            None,
        )
        .into_response()
    }
}

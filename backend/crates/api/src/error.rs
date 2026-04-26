use axum::{Json, http::StatusCode, response::IntoResponse};
use serde_json::Value;
use thiserror::Error;

use crate::http::{ApiError, ErrorBody};

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

        let status = StatusCode::INTERNAL_SERVER_ERROR;
        let body = ApiError {
            status: "error",
            error: ErrorBody {
                code: "INTERNAL_ERROR",
                message: "An unexpected error occurred.",
                details: None::<Vec<Value>>,
            },
        };

        (status, Json(body)).into_response()
    }
}

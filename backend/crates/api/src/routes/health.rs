use axum::{extract::State, http::StatusCode, response::IntoResponse};
use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

use crate::{http::ApiSuccess, http::json_ok, state::AppState};

#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum CheckStatus {
    Ok,
    Error,
}

#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ServiceStatus {
    Healthy,
    Degraded,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct HealthChecks {
    database: CheckStatus,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct HealthData {
    service: &'static str,
    status: ServiceStatus,
    checks: HealthChecks,
    timestamp: DateTime<Utc>,
}

pub type HealthResponse = ApiSuccess<HealthData>;

#[utoipa::path(
    get,
    path = "/api/v1/health",
    tag = "operations",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse),
        (status = 503, description = "Service is degraded", body = HealthResponse)
    )
)]
pub async fn health(State(state): State<AppState>) -> impl IntoResponse {
    let timestamp = Utc::now();
    let database = match sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.db)
        .await
    {
        Ok(_) => CheckStatus::Ok,
        Err(error) => {
            tracing::error!(error = %error, "health check database probe failed");
            CheckStatus::Error
        }
    };

    let healthy = matches!(database, CheckStatus::Ok);
    let status = if healthy {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    json_ok(
        HealthData {
            service: "kiebex",
            status: if healthy {
                ServiceStatus::Healthy
            } else {
                ServiceStatus::Degraded
            },
            checks: HealthChecks { database },
            timestamp,
        },
        status,
    )
}

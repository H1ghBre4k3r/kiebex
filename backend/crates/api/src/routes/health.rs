use axum::{extract::State, http::StatusCode, response::IntoResponse};
use chrono::Utc;

use crate::{
    http::{ApiSuccess, json_ok},
    models::{
        self,
        health::{CheckStatus, HealthChecks, HealthData, ServiceStatus},
    },
    state::AppState,
};

#[utoipa::path(
    get,
    path = "/api/v1/health",
    tag = "operations",
    responses(
        (status = 200, description = "Service is healthy", body = ApiSuccess<models::health::HealthData>),
        (status = 503, description = "Service is degraded", body = ApiSuccess<models::health::HealthData>)
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

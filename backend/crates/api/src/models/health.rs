use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

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
    pub database: CheckStatus,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct HealthData {
    pub service: &'static str,
    pub status: ServiceStatus,
    pub checks: HealthChecks,
    pub timestamp: DateTime<Utc>,
}

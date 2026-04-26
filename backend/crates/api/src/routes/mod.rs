mod health;
mod metrics;

use axum::{Router, routing::get};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::state::AppState;

#[derive(OpenApi)]
#[openapi(
    paths(health::health),
    components(schemas(
        crate::http::ErrorDetail,
        health::HealthData,
        health::HealthChecks,
        health::HealthResponse,
        health::CheckStatus,
        health::ServiceStatus
    )),
    tags((name = "operations", description = "Operational endpoints"))
)]
struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/v1/health", get(health::health))
        .route("/api/v1/metrics", get(metrics::metrics))
        .merge(SwaggerUi::new("/api-docs").url("/api-docs/openapi.json", openapi()))
        .with_state(state)
}

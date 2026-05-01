mod beer_styles;
mod health;
mod metrics;

use axum::{Router, routing::get};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::state::AppState;

#[derive(OpenApi)]
#[openapi(
    paths(
        health::health,
        beer_styles::get_beer_styles
    ),
    components(schemas(
        crate::http::ErrorDetail,
        crate::http::ApiSuccess<health::HealthData>,
        crate::http::ApiSuccess<beer_styles::BeerStylesData>,
        health::HealthData,
        health::HealthChecks,
        health::CheckStatus,
        health::ServiceStatus,
        beer_styles::BeerStyle,
        beer_styles::BeerStylesData,
    )),
    tags(
        (name = "operations", description = "Operational endpoints"),
        (name = "catalog", description = "Public catalog endpoints")
    )
)]
struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/v1/health", get(health::health))
        .route("/api/v1/beer-styles", get(beer_styles::get_beer_styles))
        .route("/api/v1/metrics", get(metrics::metrics))
        .merge(SwaggerUi::new("/api-docs").url("/api-docs/openapi.json", openapi()))
        .with_state(state)
}

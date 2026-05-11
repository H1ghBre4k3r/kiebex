use axum::{extract::State, http::header, response::IntoResponse};

use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/metrics",
    tag = "operations",
    responses(
        (status = 200, description = "Prometheus metrics", content_type = "text/plain")
    )
)]
pub async fn metrics(State(state): State<AppState>) -> impl IntoResponse {
    (
        [
            (header::CONTENT_TYPE, "text/plain; version=0.0.4"),
            (header::CACHE_CONTROL, "no-cache"),
        ],
        state.metrics.render(),
    )
}

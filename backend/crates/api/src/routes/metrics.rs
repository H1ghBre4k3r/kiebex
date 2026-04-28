use axum::{extract::State, http::header, response::IntoResponse};

use crate::state::AppState;

pub async fn metrics(State(state): State<AppState>) -> impl IntoResponse {
    (
        [
            (header::CONTENT_TYPE, "text/plain; version=0.0.4"),
            (header::CACHE_CONTROL, "no-cache"),
        ],
        state.metrics.render(),
    )
}

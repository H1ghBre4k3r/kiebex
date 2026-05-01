use axum::{extract::State, http::StatusCode, response::IntoResponse};
use serde::Serialize;
use utoipa::ToSchema;

use crate::{
    http::{ApiSuccess, json_ok},
    state::AppState,
};

#[derive(Debug, Serialize, ToSchema)]
pub struct BeerStyle {
    id: String,
    name: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BeerStylesData {
    styles: Vec<BeerStyle>,
    count: usize,
}

#[utoipa::path(
    get,
    path = "/api/v1/beer-styles",
    tag = "catalog",
    responses(
        (status = 200, description = "Beer styles ordered by name", body = ApiSuccess<BeerStylesData>)
    )
)]
pub async fn get_beer_styles(State(state): State<AppState>) -> impl IntoResponse {
    let styles = sqlx::query_as!(
        BeerStyle,
        r#"SELECT id, name FROM "BeerStyle" ORDER BY name ASC"#
    )
    .fetch_all(&state.db)
    .await
    .unwrap();

    json_ok(
        BeerStylesData {
            count: styles.len(),
            styles,
        },
        StatusCode::OK,
    )
}

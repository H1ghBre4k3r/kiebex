use axum::{extract::State, http::StatusCode, response::IntoResponse};

use crate::{
    error::AppError,
    http::{ApiSuccess, json_ok},
    models::catalog::BeerStylesData,
    repositories::catalog,
    state::AppState,
};

#[utoipa::path(
    get,
    path = "/api/v1/beer-styles",
    tag = "catalog",
    responses(
        (status = 200, description = "Beer styles ordered by name", body = ApiSuccess<BeerStylesData>)
    )
)]
pub async fn get_beer_styles(State(state): State<AppState>) -> Result<impl IntoResponse, AppError> {
    let styles = catalog::fetch_beer_styles(&state.db).await?;

    Ok(json_ok(
        BeerStylesData {
            count: styles.len(),
            styles,
        },
        StatusCode::OK,
    ))
}

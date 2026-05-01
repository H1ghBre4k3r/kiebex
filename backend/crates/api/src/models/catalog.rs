use serde::Serialize;
use sqlx::prelude::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct BeerStyle {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BeerStylesData {
    pub count: usize,
    pub styles: Vec<BeerStyle>,
}

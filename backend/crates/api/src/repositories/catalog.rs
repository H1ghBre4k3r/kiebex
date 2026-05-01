use sqlx::PgPool;

use crate::{error::AppError, models::catalog::BeerStyle};

pub async fn fetch_beer_styles(db: &PgPool) -> Result<Vec<BeerStyle>, AppError> {
    let styles =
        sqlx::query_as::<_, BeerStyle>(r#"SELECT id, name FROM "BeerStyle" ORDER BY name ASC"#)
            .fetch_all(db)
            .await?;

    Ok(styles)
}

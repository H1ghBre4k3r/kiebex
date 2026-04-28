use api::{config::Config, serve};

#[tokio::main]
async fn main() -> Result<(), api::error::AppError> {
    dotenvy::dotenv().ok();
    api::observability::init_tracing();

    let config = Config::from_env()?;
    serve(config).await
}

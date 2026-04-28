pub mod config;
pub mod db;
pub mod error;
pub mod http;
pub mod observability;
pub mod routes;
pub mod state;

use axum::Router;
use axum::middleware;
use tokio::net::TcpListener;
use tower_http::{
    compression::CompressionLayer,
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    sensitive_headers::SetSensitiveRequestHeadersLayer,
    trace::TraceLayer,
};

use crate::{
    config::Config, db::create_pool, error::AppError, observability::Metrics, state::AppState,
};

pub async fn serve(config: Config) -> Result<(), AppError> {
    let addr = config.bind_addr;
    let app = build_app(config).await?;
    let listener = TcpListener::bind(addr).await?;

    tracing::info!(%addr, "starting API server");
    axum::serve(listener, app).await?;

    Ok(())
}

pub async fn build_app(config: Config) -> Result<Router, AppError> {
    let metrics = Metrics::install()?;
    let pool = create_pool(&config).await?;
    let state = AppState::new(config, pool, metrics);
    let request_id_header = axum::http::header::HeaderName::from_static("x-request-id");

    Ok(routes::router(state).layer(
        tower::ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .layer(middleware::from_fn(observability::record_http_metrics))
            .layer(SetSensitiveRequestHeadersLayer::new([
                axum::http::header::AUTHORIZATION,
            ]))
            .layer(SetRequestIdLayer::new(
                request_id_header.clone(),
                MakeRequestUuid,
            ))
            .layer(PropagateRequestIdLayer::new(request_id_header))
            .layer(CompressionLayer::new()),
    ))
}

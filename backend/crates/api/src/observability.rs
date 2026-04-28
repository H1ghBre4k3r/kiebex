use std::time::{Duration, Instant};

use axum::{
    body::Body,
    extract::MatchedPath,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use metrics::{counter, histogram};
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
pub struct Metrics {
    handle: PrometheusHandle,
}

impl Metrics {
    pub fn install() -> Result<Self, metrics_exporter_prometheus::BuildError> {
        let handle = PrometheusBuilder::new()
            .set_buckets_for_metric(
                metrics_exporter_prometheus::Matcher::Full(
                    "kiebex_http_request_duration_seconds".to_owned(),
                ),
                &[
                    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
                ],
            )?
            .install_recorder()?;

        let upkeep_handle = handle.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));

            loop {
                interval.tick().await;
                upkeep_handle.run_upkeep();
            }
        });

        Ok(Self { handle })
    }

    pub fn render(&self) -> String {
        self.handle.render()
    }
}

pub fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("api=info,tower_http=info"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer().json())
        .init();
}

pub async fn record_http_metrics(request: Request<Body>, next: Next) -> Response {
    let method = request.method().as_str().to_owned();
    let route = request
        .extensions()
        .get::<MatchedPath>()
        .map(|path| path.as_str().to_owned())
        .unwrap_or_else(|| request.uri().path().to_owned());
    let started_at = Instant::now();

    let response = next.run(request).await;
    let status = response.status();
    record_http_request(&method, &route, status, started_at.elapsed().as_secs_f64());

    response
}

fn record_http_request(method: &str, route: &str, status: StatusCode, duration_seconds: f64) {
    let status_code = status.as_u16().to_string();

    counter!(
        "kiebex_http_requests_total",
        "method" => method.to_owned(),
        "route" => route.to_owned(),
        "status_code" => status_code.clone(),
    )
    .increment(1);

    histogram!(
        "kiebex_http_request_duration_seconds",
        "method" => method.to_owned(),
        "route" => route.to_owned(),
        "status_code" => status_code,
    )
    .record(duration_seconds);
}

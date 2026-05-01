use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
#[schema(as = ApiSuccess<T>)]
pub struct ApiSuccess<T: Serialize> {
    pub status: &'static str,
    pub data: T,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(as = ApiError<D>)]
pub struct ApiError<D: Serialize = Vec<ErrorDetail>> {
    pub status: &'static str,
    pub error: ErrorBody<D>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorBody<D: Serialize = Vec<ErrorDetail>> {
    pub code: &'static str,
    pub message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<D>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorDetail {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    pub message: String,
}

pub fn json_ok<T>(data: T, status: StatusCode) -> impl IntoResponse
where
    T: Serialize,
{
    (status, Json(ApiSuccess { status: "ok", data }))
}

pub fn json_error(
    status: StatusCode,
    code: &'static str,
    message: &'static str,
    details: Option<Vec<ErrorDetail>>,
) -> impl IntoResponse {
    let body = ApiError {
        status: "error",
        error: ErrorBody {
            code,
            message,
            details,
        },
    };

    (status, Json(body))
}

#[cfg(test)]
mod tests {
    use axum::{body::to_bytes, http::StatusCode, response::IntoResponse};
    use serde_json::json;

    use super::{ErrorDetail, json_error, json_ok};

    #[tokio::test]
    async fn json_ok_uses_existing_success_envelope() {
        let response = json_ok(json!({ "service": "kiebex" }), StatusCode::CREATED).into_response();

        assert_eq!(response.status(), StatusCode::CREATED);

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let value: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(
            value,
            json!({
                "status": "ok",
                "data": { "service": "kiebex" }
            })
        );
    }

    #[tokio::test]
    async fn json_error_uses_existing_error_envelope() {
        let response = json_error(
            StatusCode::BAD_REQUEST,
            "INVALID_BODY",
            "Invalid request body.",
            Some(vec![ErrorDetail {
                path: Some("email".to_owned()),
                message: "Invalid email.".to_owned(),
            }]),
        )
        .into_response();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let value: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(
            value,
            json!({
                "status": "error",
                "error": {
                    "code": "INVALID_BODY",
                    "message": "Invalid request body.",
                    "details": [{ "path": "email", "message": "Invalid email." }]
                }
            })
        );
    }
}

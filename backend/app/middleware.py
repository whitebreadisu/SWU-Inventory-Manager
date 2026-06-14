import logging
import time

from fastapi import Request

logger = logging.getLogger("app.request")


async def log_requests(request: Request, call_next):
    """Emit one structured log line per request.

    tenant_id comes from request.state, set by get_db() once the caller's
    identity resolves to a tenant -- requests that never reach get_db (e.g.
    a 401 from get_current_identity, or /health) log tenant_id: null.
    severity reflects the response status so Cloud Monitoring/Error
    Reporting can filter on it directly (see logging_config.JSONFormatter).
    """
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.error(
            "request failed",
            exc_info=True,
            extra={
                "httpRequest": {
                    "requestMethod": request.method,
                    "requestUrl": request.url.path,
                    "status": 500,
                    "latency": f"{duration_ms / 1000:.3f}s",
                },
                "tenant_id": getattr(request.state, "tenant_id", None),
            },
        )
        raise

    duration_ms = (time.perf_counter() - start) * 1000
    extra = {
        "httpRequest": {
            "requestMethod": request.method,
            "requestUrl": request.url.path,
            "status": response.status_code,
            "latency": f"{duration_ms / 1000:.3f}s",
        },
        "tenant_id": getattr(request.state, "tenant_id", None),
    }
    if response.status_code >= 500:
        logger.error("request completed", extra=extra)
    elif response.status_code >= 400:
        logger.warning("request completed", extra=extra)
    else:
        logger.info("request completed", extra=extra)

    return response

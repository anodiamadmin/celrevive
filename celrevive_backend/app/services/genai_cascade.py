import logging
import time
from typing import Any, Callable, TypeVar

from google import genai
from google.genai import types

logger = logging.getLogger("celrevive_backend.genai_cascade")

T = TypeVar("T")

TRANSIENT_STATUS_TOKENS = (
    "503",
    "429",
    "500",
    "UNAVAILABLE",
    "RESOURCE_EXHAUSTED",
    "INTERNAL",
)


def resolve_model_cascade(
    settings: Any,
    primary_attr: str,
    fallback_attr: str,
    error_cls: type[Exception],
) -> list[str]:
    models: list[str] = []

    primary = getattr(settings, primary_attr, None)
    if isinstance(primary, str) and primary.strip():
        models.append(primary.strip())

    raw_fallbacks = getattr(settings, fallback_attr, None) or ""
    if isinstance(raw_fallbacks, (list, tuple)):
        candidates = [str(m).strip() for m in raw_fallbacks]
    else:
        candidates = [m.strip() for m in str(raw_fallbacks).split(",")]

    for model_name in candidates:
        if model_name and model_name not in models:
            models.append(model_name)

    if not models:
        raise error_cls(f"No model configured for {primary_attr}")

    return models


def is_transient_provider_error(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    if status_code in (429, 500, 503, "429", "500", "503"):
        return True
    message = str(exc).upper()
    return any(token in message for token in TRANSIENT_STATUS_TOKENS)


def generate_with_cascade(
    *,
    stage_name: str,
    api_key: str,
    models: list[str],
    contents: Any,
    config: types.GenerateContentConfig,
    error_cls: type[Exception],
    max_retries_per_model: int = 1,
    base_backoff_seconds: float = 1.5,
) -> Any:
    if not api_key:
        raise error_cls("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
    last_exc: Exception | None = None

    for model_name in models:
        for attempt in range(max_retries_per_model + 1):
            try:
                logger.info(
                    "%s AI calling model=%s attempt=%d/%d",
                    stage_name,
                    model_name,
                    attempt + 1,
                    max_retries_per_model + 1,
                )
                return client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
            except Exception as exc:
                last_exc = exc
                if is_transient_provider_error(exc) and attempt < max_retries_per_model:
                    delay = base_backoff_seconds * (attempt + 1)
                    logger.warning(
                        "%s AI transient error on model=%s attempt=%d; retrying in %.1fs: %s",
                        stage_name,
                        model_name,
                        attempt + 1,
                        delay,
                        exc,
                    )
                    time.sleep(delay)
                    continue

                logger.warning(
                    "%s AI call failed on model=%s: %s",
                    stage_name,
                    model_name,
                    exc,
                )
                break

    logger.exception(
        "%s AI call failed across cascade models=%s",
        stage_name,
        models,
        exc_info=last_exc,
    )
    raise error_cls(str(last_exc)) from last_exc
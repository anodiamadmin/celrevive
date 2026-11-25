import hashlib
import logging
import os
import uuid
from pathlib import Path
from urllib.parse import ParseResult, quote, unquote, urlparse

from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger("celrevive.storage")

_client: Client | None = None

_ALLOWED_EXTENSIONS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}

_LOCAL_DEV_ENV_NAMES = {"", "dev", "development", "local", "test"}


class StoredImage:
    def __init__(
        self,
        storage_uri: str,
        sha256: str,
        file_size_bytes: int,
    ):
        self.storage_uri = storage_uri
        self.sha256 = sha256
        self.file_size_bytes = file_size_bytes


def _is_production_environment() -> bool:
    if os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"):
        return True

    env_name = (
        os.getenv("APP_ENV")
        or os.getenv("ENVIRONMENT")
        or os.getenv("ENV")
        or ""
    ).strip().lower()

    return env_name in {"prod", "production"} or env_name not in _LOCAL_DEV_ENV_NAMES


def _is_local_dev_fallback_allowed() -> bool:
    if _is_production_environment():
        return False

    settings = get_settings()
    has_supabase_url = bool((getattr(settings, "SUPABASE_URL", None) or "").strip())
    has_service_key = bool(
        (getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None) or "").strip()
    )
    return not (has_supabase_url and has_service_key)


def _get_local_storage_root() -> Path:
    settings = get_settings()
    root = Path(settings.SKIN_IMAGE_STORAGE_ROOT).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _resolve_safe_local_path(raw_path: str) -> Path:
    if len(raw_path) > 2 and raw_path[0] == "/" and raw_path[2] == ":":
        raw_path = raw_path[1:]
    path = Path(unquote(raw_path)).resolve()
    storage_root = _get_local_storage_root()
    if path != storage_root and storage_root not in path.parents:
        raise ValueError("Image path is outside the configured storage root")
    return path


def get_storage_client() -> Client:
    """Return a lazily initialized Supabase client."""
    global _client

    if _client is None:
        settings = get_settings()

        if not settings.SUPABASE_URL:
            raise RuntimeError("SUPABASE_URL is not configured")

        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_SERVICE_ROLE_KEY is not configured"
            )

        _client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )

    return _client


def save_image_bytes(
    image_bytes: bytes,
    session_id: uuid.UUID,
    extension: str,
) -> StoredImage:
    """Upload validated image bytes to Supabase Storage, or local disk in local dev."""

    if not image_bytes:
        raise ValueError("Cannot upload an empty image")

    extension = extension.lower()
    if extension not in _ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported image extension: {extension}")

    sha256 = hashlib.sha256(image_bytes).hexdigest()

    if _is_local_dev_fallback_allowed():
        local_dir = _get_local_storage_root() / str(session_id)
        local_dir.mkdir(parents=True, exist_ok=True)
        dest_path = (local_dir / f"{uuid.uuid4().hex}{extension}").resolve()
        dest_path.write_bytes(image_bytes)
        logger.info(
            "Saved image to local dev storage at %s for session %s",
            dest_path,
            session_id,
        )
        return StoredImage(
            storage_uri=dest_path.as_uri(),
            sha256=sha256,
            file_size_bytes=len(image_bytes),
        )

    filename = f"{uuid.uuid4().hex}{extension}"
    object_path = f"{session_id}/{filename}"

    settings = get_settings()
    bucket = settings.SUPABASE_STORAGE_BUCKET

    client = get_storage_client()

    client.storage.from_(bucket).upload(
        path=object_path,
        file=image_bytes,
        file_options={
            "content-type": _ALLOWED_EXTENSIONS[extension],
            "upsert": "false",
        },
    )

    storage_uri = (
        f"supabase://{bucket}/{quote(object_path, safe='/')}"
    )

    return StoredImage(
        storage_uri=storage_uri,
        sha256=sha256,
        file_size_bytes=len(image_bytes),
    )


def read_image_bytes(storage_uri: str) -> bytes:
    """Download an image from Supabase or local disk."""

    parsed = urlparse(storage_uri)

    if parsed.scheme == "file":
        path = _resolve_safe_local_path(parsed.path or parsed.netloc)
        return path.read_bytes()

    if parsed.scheme != "supabase":
        raise ValueError(
            f"Unsupported storage URI scheme: {parsed.scheme}"
        )

    bucket, object_path = _parse_supabase_uri(parsed)
    client = get_storage_client()

    return client.storage.from_(bucket).download(object_path)


def delete_image(storage_uri: str) -> None:
    """Delete an image from Supabase Storage or local disk."""

    parsed = urlparse(storage_uri)

    if parsed.scheme == "file":
        path = _resolve_safe_local_path(parsed.path or parsed.netloc)
        if path.exists():
            path.unlink()
        return

    if parsed.scheme != "supabase":
        raise ValueError(
            f"Unsupported storage URI scheme: {parsed.scheme}"
        )

    bucket, object_path = _parse_supabase_uri(parsed)
    client = get_storage_client()

    client.storage.from_(bucket).remove([object_path])


def generate_signed_url(
    storage_uri: str,
    expires_in: int = 300,
) -> str:
    """Generate a temporary URL for accessing a private image."""

    parsed = urlparse(storage_uri)

    if parsed.scheme != "supabase":
        raise ValueError(
            f"Unsupported storage URI scheme: {parsed.scheme}"
        )

    if not 1 <= expires_in <= 3600:
        raise ValueError("Signed URL expiry must be between 1 and 3600 seconds")

    bucket, object_path = _parse_supabase_uri(parsed)
    client = get_storage_client()

    result = client.storage.from_(bucket).create_signed_url(
        object_path,
        expires_in,
    )

    signed_url = result.get("signedURL") or result.get("signedUrl")

    if not signed_url:
        raise RuntimeError("Supabase did not return a signed URL")

    return signed_url


def _parse_supabase_uri(parsed: ParseResult) -> tuple[str, str]:
    bucket = parsed.netloc
    object_path = unquote(parsed.path.lstrip("/"))

    if not bucket or not object_path:
        raise ValueError("Invalid Supabase storage URI")

    return bucket, object_path
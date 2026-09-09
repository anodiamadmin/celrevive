"""External image storage adapter used by the MVP image workflow."""

import hashlib
from pathlib import Path
from uuid import UUID

from app.core.config import get_settings


_MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def store_image(
    session_id: UUID,
    file_bytes: bytes,
    image_id: UUID,
    mime_type: str,
) -> tuple[str, str]:
    """Persist image bytes outside PostgreSQL and return URI + SHA-256."""
    settings = get_settings()
    root = Path(settings.IMAGE_STORAGE_DIR).expanduser().resolve()
    target_dir = root / str(session_id)
    target_dir.mkdir(parents=True, exist_ok=True)

    extension = _MIME_EXTENSIONS.get(mime_type.lower())
    if extension is None:
        raise ValueError(f"Unsupported image MIME type: {mime_type}")

    target = target_dir / f"{image_id}{extension}"
    target.write_bytes(file_bytes)

    digest = hashlib.sha256(file_bytes).hexdigest()
    return target.as_uri(), digest


def delete_image(storage_uri: str) -> None:
    """Best-effort cleanup used when metadata persistence fails."""
    prefix = "file://"
    if not storage_uri.startswith(prefix):
        return

    path = Path(storage_uri[len(prefix):])
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass

import hashlib
import uuid
from pathlib import Path
from urllib.parse import unquote, urlparse

from app.core.config import get_settings

# Swap this for an S3/GCS-backed implementation later; interface stays the same.
LOCAL_STORAGE_ROOT = Path(get_settings().SKIN_IMAGE_STORAGE_ROOT)
LOCAL_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


class StoredImage:
    def __init__(self, storage_uri: str, sha256: str, file_size_bytes: int):
        self.storage_uri = storage_uri
        self.sha256 = sha256
        self.file_size_bytes = file_size_bytes


def save_image_bytes(image_bytes: bytes, session_id: uuid.UUID, extension: str) -> StoredImage:
    """Persist validated image bytes to storage and return locator + integrity metadata."""
    sha256 = hashlib.sha256(image_bytes).hexdigest()
    filename = f"{session_id}_{uuid.uuid4().hex}{extension}"
    dest_path = LOCAL_STORAGE_ROOT / filename

    with open(dest_path, "wb") as f:
        f.write(image_bytes)

    # storage_uri is what skin_image.storage_uri stores — abstracts local vs cloud path
    return StoredImage(
        storage_uri=dest_path.resolve().as_uri(),
        sha256=sha256,
        file_size_bytes=len(image_bytes),
    )


def read_image_bytes(storage_uri: str) -> bytes:
    parsed = urlparse(storage_uri)
    if parsed.scheme != "file":
        raise ValueError(f"Unsupported storage URI scheme: {parsed.scheme}")
    # Older uploads used file://C:\path, which urlparse treats as a netloc.
    path = unquote(parsed.path or parsed.netloc)
    if len(path) > 2 and path[0] == "/" and path[2] == ":":
        path = path[1:]
    return Path(path).read_bytes()
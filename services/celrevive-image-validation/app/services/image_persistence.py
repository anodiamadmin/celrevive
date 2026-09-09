"""Persistence orchestration for accepted skin images."""

from dataclasses import dataclass
from uuid import UUID, uuid4

from app.core.database import get_connection
from app.services.image_storage import delete_image, store_image


@dataclass(frozen=True)
class PersistedImage:
    session_id: UUID
    image_id: UUID
    storage_uri: str
    sha256: str


def persist_accepted_image(
    *,
    session_id: UUID | None,
    file_bytes: bytes,
    original_filename: str | None,
    mime_type: str,
    image_width: int | None,
    image_height: int | None,
) -> PersistedImage:
    """Store the binary image and its PostgreSQL metadata atomically."""
    image_id = uuid4()
    effective_session_id = session_id or uuid4()
    create_session = session_id is None

    storage_uri, sha256 = store_image(
        session_id=effective_session_id,
        file_bytes=file_bytes,
        image_id=image_id,
        mime_type=mime_type,
    )

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                if create_session:
                    cursor.execute(
                        """
                        INSERT INTO customer_session (session_id, session_status)
                        VALUES (%s, 'STARTED')
                        """,
                        (effective_session_id,),
                    )
                else:
                    cursor.execute(
                        "SELECT 1 FROM customer_session WHERE session_id = %s",
                        (effective_session_id,),
                    )
                    if cursor.fetchone() is None:
                        raise ValueError("The supplied session_id does not exist.")

                cursor.execute(
                    """
                    INSERT INTO skin_image (
                        image_id,
                        session_id,
                        storage_uri,
                        original_filename,
                        mime_type,
                        file_size_bytes,
                        image_width,
                        image_height,
                        sha256
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        image_id,
                        effective_session_id,
                        storage_uri,
                        original_filename,
                        mime_type,
                        len(file_bytes),
                        image_width,
                        image_height,
                        sha256,
                    ),
                )

                cursor.execute(
                    """
                    UPDATE customer_session
                    SET session_status = 'IMAGE_RECEIVED',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE session_id = %s
                    """,
                    (effective_session_id,),
                )

        return PersistedImage(
            session_id=effective_session_id,
            image_id=image_id,
            storage_uri=storage_uri,
            sha256=sha256,
        )
    except Exception:
        delete_image(storage_uri)
        raise

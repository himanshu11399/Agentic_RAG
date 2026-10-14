from typing import Any
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row

from app.core.config import settings


def get_connection() -> psycopg.Connection:
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    return psycopg.connect(
        settings.DATABASE_URL,
        connect_timeout=10,
        row_factory=dict_row,
    )


def create_conversation(
    user_id: str,
    title: str = "New Chat",
) -> dict[str, Any]:
    conversation_id = str(uuid4())

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO conversations (id, user_id, title)
                VALUES (%s, %s, %s)
                RETURNING id, user_id, title, created_at, updated_at
                """,
                (conversation_id, user_id, title),
            )
            conversation = cursor.fetchone()

    return conversation


def list_conversations(user_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM conversations
                WHERE user_id = %s
                ORDER BY updated_at DESC
                """,
                (user_id,),
            )
            return cursor.fetchall()


def get_conversation(
    user_id: str,
    conversation_id: str,
) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM conversations
                WHERE id = %s AND user_id = %s
                """,
                (conversation_id, user_id),
            )
            return cursor.fetchone()


def save_message(
    user_id: str,
    conversation_id: str,
    role: str,
    content: str,
) -> dict[str, Any] | None:
    if role not in {"user", "assistant"}:
        raise ValueError("role must be 'user' or 'assistant'")

    if not content.strip():
        raise ValueError("Message content cannot be empty")

    message_id = str(uuid4())

    with get_connection() as connection:
        with connection.cursor() as cursor:
            # Insert only if the conversation belongs to this user.
            cursor.execute(
                """
                INSERT INTO messages (
                    id, conversation_id, user_id, role, content
                )
                SELECT %s, id, user_id, %s, %s
                FROM conversations
                WHERE id = %s AND user_id = %s
                RETURNING id, conversation_id, role, content, created_at
                """,
                (
                    message_id,
                    role,
                    content,
                    conversation_id,
                    user_id,
                ),
            )
            message = cursor.fetchone()

            if message is None:
                return None

            cursor.execute(
                """
                UPDATE conversations
                SET updated_at = NOW()
                WHERE id = %s AND user_id = %s
                """,
                (conversation_id, user_id),
            )

    return message


def list_messages(
    user_id: str,
    conversation_id: str,
) -> list[dict[str, Any]] | None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            # None means the conversation does not belong to this user.
            cursor.execute(
                """
                SELECT id
                FROM conversations
                WHERE id = %s AND user_id = %s
                """,
                (conversation_id, user_id),
            )

            if cursor.fetchone() is None:
                return None

            cursor.execute(
                """
                SELECT id, role, content, created_at
                FROM messages
                WHERE conversation_id = %s AND user_id = %s
                ORDER BY created_at ASC, id ASC
                """,
                (conversation_id, user_id),
            )
            return cursor.fetchall()


def delete_conversation(
    user_id: str,
    conversation_id: str,
) -> bool:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM conversations
                WHERE id = %s AND user_id = %s
                """,
                (conversation_id, user_id),
            )
            return cursor.rowcount > 0
        
        

def rename_conversation(
    user_id: str,
    conversation_id: str,
    title: str,
) -> dict | None:
    title = title.strip()

    if not title:
        raise ValueError("Title cannot be empty")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE conversations
                SET title = %s,
                    updated_at = NOW()
                WHERE id = %s
                  AND user_id = %s
                RETURNING id, title, created_at, updated_at
                """,
                (title, conversation_id, user_id),
            )
            row = cur.fetchone()

    if row is None:
        return None

    return dict(row)


        
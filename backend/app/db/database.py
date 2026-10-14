import psycopg

from app.core.config import settings


def test_database_connection() -> int:
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    with psycopg.connect(
        settings.DATABASE_URL,
        connect_timeout=10,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()

    return result[0]
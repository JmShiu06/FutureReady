"""Public catalog storage. Schema is applied in development, never at application startup."""
import hashlib
import json
import os
import logging

import pandas as pd
import psycopg
from psycopg.types.json import Jsonb

from .config import CATALOG


def fingerprint() -> str:
    return hashlib.sha256(CATALOG.read_bytes()).hexdigest()


def source_courses() -> list[dict]:
    frame = pd.read_json(CATALOG, compression="gzip")
    # Normalize pandas NaN to JSON null while preserving real source values.
    return json.loads(frame.to_json(orient="records", force_ascii=False))


class CourseRepository:
    def load(self) -> list[dict]:
        with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
            rows = connection.execute(
                "SELECT payload FROM skill_learning_courses WHERE catalog_fingerprint = %s ORDER BY id",
                (fingerprint(),),
            ).fetchall()
        if len(rows) != 13783:
            logging.getLogger(__name__).info("Refreshing PostgreSQL public reference catalog from the bundled source")
            self.ingest()
            with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
                rows = connection.execute(
                    "SELECT payload FROM skill_learning_courses WHERE catalog_fingerprint = %s ORDER BY id",
                    (fingerprint(),),
                ).fetchall()
            if len(rows) != 13783:
                raise RuntimeError("Public catalog ingestion was incomplete.")
        return [row[0] for row in rows]

    def ingest(self) -> int:
        courses = source_courses()
        version = fingerprint()
        with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """INSERT INTO skill_learning_courses (id, catalog_fingerprint, payload)
                       VALUES (%s, %s, %s)
                       ON CONFLICT (id) DO UPDATE SET catalog_fingerprint = EXCLUDED.catalog_fingerprint,
                           payload = EXCLUDED.payload""",
                    [(str(row["id"]), version, Jsonb(row)) for row in courses],
                )
        return len(courses)

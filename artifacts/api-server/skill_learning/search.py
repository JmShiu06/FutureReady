import logging
import re
import chromadb
from chromadb.config import Settings

from .config import CACHE, MODEL_REVISION
from .repository import fingerprint

log = logging.getLogger(__name__)


class CourseSearchService:
    def __init__(self, courses: list[dict], embeddings):
        self.courses = {str(course["id"]): course for course in courses}
        self.embeddings = embeddings
        client = chromadb.PersistentClient(
            path=str(CACHE / "chroma"),
            settings=Settings(anonymized_telemetry=False),
        )
        # Corpus/model changes create a fresh derived collection, not stale embeddings.
        name = f"courses-{fingerprint()[:16]}-{MODEL_REVISION[:8]}"
        self.collection = client.get_or_create_collection(
            name, metadata={"hnsw:space": "cosine"}, embedding_function=None,
        )

    def prepare(self):
        existing = set(self.collection.get(include=[])["ids"])
        pending = [course for course in self.courses.values() if str(course["id"]) not in existing]
        for offset in range(0, len(pending), 128):
            batch = pending[offset:offset + 128]
            documents = [
                f"{row['title']}. Skills: {', '.join(row['skills'])}. {row['description']}"
                for row in batch
            ]
            self.collection.upsert(
                ids=[str(row["id"]) for row in batch],
                documents=documents,
                embeddings=self.embeddings.encode(documents),
            )
            if offset % 1024 == 0:
                log.info("Indexed %s/%s public course records", len(existing) + offset + len(batch), len(self.courses))
        if self.collection.count() != len(self.courses):
            raise RuntimeError("Chroma course index is incomplete.")

    def search(self, skill: str, limit: int = 80) -> list[tuple[dict, float]]:
        results = self.collection.query(
            query_embeddings=self.embeddings.encode([f"Learn {skill}"]),
            n_results=min(limit, len(self.courses)),
            include=["distances"],
        )
        return [
            (self.courses[course_id], max(0.0, min(1.0, 1 - distance)))
            for course_id, distance in zip(results["ids"][0], results["distances"][0])
        ]

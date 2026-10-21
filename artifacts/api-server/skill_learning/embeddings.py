"""CPU sentence-transformer service. User queries remain in memory and are never indexed."""
import os
from threading import Lock

from .config import CACHE, MAX_SEQUENCE_LENGTH, MODEL, MODEL_REVISION


class EmbeddingService:
    def __init__(self):
        os.environ.setdefault("HF_HOME", str(CACHE / "models"))
        os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        from sentence_transformers import SentenceTransformer
        import torch
        torch.set_num_threads(4)
        self.model = SentenceTransformer(
            MODEL, revision=MODEL_REVISION, device="cpu", cache_folder=str(CACHE / "models")
        )
        self.model.max_seq_length = MAX_SEQUENCE_LENGTH
        self.lock = Lock()

    def encode(self, texts: list[str]):
        with self.lock:
            return self.model.encode(
                texts, batch_size=64, normalize_embeddings=True,
                convert_to_numpy=True, show_progress_bar=False,
            ).tolist()

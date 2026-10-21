from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]
ROOT = API_DIR.parents[1]
CATALOG = API_DIR / "src/data/skill_learning_catalog.json.gz"
CACHE = ROOT / "generated-artifacts/skill-learning"
MODEL = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_REVISION = "c9745ed1d9f207416be6d2e6f8de32d1f16199bf"
MAX_SEQUENCE_LENGTH = 256

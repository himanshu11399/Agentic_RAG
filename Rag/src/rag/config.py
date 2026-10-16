
import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")

DATA_DIR = PROJECT_ROOT / "data" / "documents"
VECTOR_STORE_DIR = PROJECT_ROOT / "data" / "index"

# Local embedding model
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Chunking
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

# Retrieval
TOP_K = 4

# Groq LLM
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing from .env")

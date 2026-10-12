import os
from pathlib import Path
from dotenv import load_dotenv

# Locate backend/.env independently of the working directory
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / '.env')

class Setting:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    
    def validate_settings(self) -> None:
        if not self.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set")
        if not self.GROQ_MODEL:
            raise ValueError("GROQ_MODEL is not set")

settings = Setting()
settings.validate_settings()
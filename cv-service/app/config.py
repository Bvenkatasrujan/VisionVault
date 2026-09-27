import os
from dotenv import load_dotenv

# Load .env file from root of cv-service
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-supabase-project.supabase.co")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "your_supabase_secret_key")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "visionvault-5566b")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME", "visionvault-files")

DEFAULT_SA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "secrets", "firebase-service-account.json")
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", DEFAULT_SA_PATH)

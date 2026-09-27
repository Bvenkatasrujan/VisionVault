import re
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_BUCKET_NAME

_supabase_instance: Client = None

def get_supabase_client() -> Client:
    global _supabase_instance
    if _supabase_instance is None:
        _supabase_instance = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
    return _supabase_instance

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes filename to prevent directory traversal attacks (e.g. ../../secret.txt)
    """
    clean_name = re.sub(r'[\/\\:\*\?"<>\|]', '_', filename)
    clean_name = re.sub(r'\.\.+', '.', clean_name)
    return clean_name.strip(' .') or "unnamed_file"

def upload_file_to_supabase(storage_path: str, file_bytes: bytes, content_type: str = "application/octet-stream") -> dict:
    supabase = get_supabase_client()
    bucket = supabase.storage.from_(SUPABASE_BUCKET_NAME)
    
    try:
        response = bucket.upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        return response
    except Exception as e:
        # Check if error is due to missing bucket or network issue
        raise Exception(f"Supabase storage upload error for path '{storage_path}': {str(e)}")

def get_signed_url_from_supabase(storage_path: str, expires_in: int = 3600) -> str:
    supabase = get_supabase_client()
    bucket = supabase.storage.from_(SUPABASE_BUCKET_NAME)
    
    try:
        res = bucket.create_signed_url(path=storage_path, expires_in=expires_in)
        if isinstance(res, dict) and "signedUrl" in res:
            return res["signedUrl"]
        elif hasattr(res, "signed_url"):
            return res.signed_url
        elif isinstance(res, str):
            return res
        return res.get("signedURL", "")
    except Exception as e:
        raise Exception(f"Failed to generate signed download URL from Supabase: {str(e)}")

def delete_file_from_supabase(storage_path: str) -> dict:
    supabase = get_supabase_client()
    bucket = supabase.storage.from_(SUPABASE_BUCKET_NAME)
    
    try:
        response = bucket.remove([storage_path])
        return response
    except Exception as e:
        raise Exception(f"Supabase storage deletion error for path '{storage_path}': {str(e)}")

import os
import glob
import json
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Header, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_PATH

def find_service_account_file():
    # 1. Check exact configured path
    if FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
        return FIREBASE_SERVICE_ACCOUNT_PATH
    
    # 2. Search secrets directory for any json file with service_account
    secrets_dir = os.path.dirname(FIREBASE_SERVICE_ACCOUNT_PATH)
    if os.path.exists(secrets_dir):
        json_files = glob.glob(os.path.join(secrets_dir, "*.json"))
        for file_path in json_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("type") == "service_account" and data.get("project_id") == FIREBASE_PROJECT_ID:
                        return file_path
            except Exception:
                continue
    return None

def initialize_firebase_admin():
    if firebase_admin._apps:
        return

    # 1. Try auto-detecting or configured Firebase service account JSON file
    sa_path = find_service_account_file()
    if sa_path and os.path.exists(sa_path):
        try:
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred, options={'projectId': FIREBASE_PROJECT_ID})
            print(f"✓ Firebase Admin SDK initialized successfully with service account at: {sa_path}")
            return
        except Exception as e:
            print(f"⚠ Error initializing Firebase Admin with service account at '{sa_path}': {e}")

    # 2. Try GOOGLE_APPLICATION_CREDENTIALS
    gac_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if gac_path and os.path.exists(gac_path):
        try:
            cred = credentials.Certificate(gac_path)
            firebase_admin.initialize_app(cred)
            print(f"✓ Firebase Admin SDK initialized via GOOGLE_APPLICATION_CREDENTIALS at: {gac_path}")
            return
        except Exception as e:
            print(f"⚠ Error initializing via GOOGLE_APPLICATION_CREDENTIALS: {e}")

    # 3. Fallback: Initialize with projectId
    try:
        firebase_admin.initialize_app(options={'projectId': FIREBASE_PROJECT_ID})
        print("⚠ Firebase Admin SDK initialized with projectId only.")
        print(f"⚠ ACTION REQUIRED: Place your Firebase Admin private key JSON in 'cv-service/secrets/' to enable backend token verification.")
    except Exception as e:
        print(f"Warning: Firebase Admin fallback initialization error: {e}")

initialize_firebase_admin()

security_scheme = HTTPBearer(auto_error=False)

async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security_scheme)) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials were not provided. Authorization header missing."
        )

    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token payload. User ID missing.")
        return decoded_token
    except Exception as e:
        err_msg = str(e)
        if "default credentials were not found" in err_msg.lower() or "credentials" in err_msg.lower():
            sa_path = FIREBASE_SERVICE_ACCOUNT_PATH
            print(f"Firebase Token Verification Failed: Missing service account credentials at '{sa_path}'")
            raise HTTPException(
                status_code=500,
                detail=f"Backend Configuration Error: Firebase Admin service account key missing. Please place your service account JSON file in 'cv-service/secrets/'."
            )
        
        print(f"Firebase token verification failed: {err_msg}")
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired Firebase authentication token: {err_msg}"
        )

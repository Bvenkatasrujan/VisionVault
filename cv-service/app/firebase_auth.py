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
    
    # 2. Search secrets directory for any json file containing service_account
    search_dirs = [
        os.path.dirname(FIREBASE_SERVICE_ACCOUNT_PATH),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "secrets"),
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ]

    for secrets_dir in search_dirs:
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

    # 1. Try FIREBASE_CREDENTIALS_JSON environment variable (e.g. on Render/cloud hosting)
    raw_env_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if raw_env_json:
        try:
            cred_dict = json.loads(raw_env_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, options={'projectId': FIREBASE_PROJECT_ID})
            print("✓ Firebase Admin SDK initialized successfully via FIREBASE_CREDENTIALS_JSON environment variable.")
            return
        except Exception as e:
            print(f"⚠ Error initializing Firebase Admin via FIREBASE_CREDENTIALS_JSON: {e}")

    # 2. Try auto-detecting or configured Firebase service account JSON file
    sa_path = find_service_account_file()
    if sa_path and os.path.exists(sa_path):
        try:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = sa_path
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred, options={'projectId': FIREBASE_PROJECT_ID})
            print(f"✓ Firebase Admin SDK initialized successfully with service account at: {sa_path}")
            return
        except Exception as e:
            print(f"⚠ Error initializing Firebase Admin with service account at '{sa_path}': {e}")

    # 3. Try GOOGLE_APPLICATION_CREDENTIALS
    gac_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if gac_path and os.path.exists(gac_path):
        try:
            cred = credentials.Certificate(gac_path)
            firebase_admin.initialize_app(cred)
            print(f"✓ Firebase Admin SDK initialized via GOOGLE_APPLICATION_CREDENTIALS at: {gac_path}")
            return
        except Exception as e:
            print(f"⚠ Error initializing via GOOGLE_APPLICATION_CREDENTIALS: {e}")

    # 4. Fallback: Initialize with projectId
    try:
        firebase_admin.initialize_app(options={'projectId': FIREBASE_PROJECT_ID})
        print("⚠ Firebase Admin SDK initialized with projectId only.")
    except Exception as e:
        print(f"Warning: Firebase Admin fallback initialization error: {e}")

initialize_firebase_admin()

import time
import json
import urllib.request
import jwt
from jwt.algorithms import RSAAlgorithm

_google_certs_cache = {}
_google_certs_expires_at = 0

def get_google_public_keys():
    global _google_certs_cache, _google_certs_expires_at
    now = time.time()
    if _google_certs_cache and now < _google_certs_expires_at:
        return _google_certs_cache

    url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "VisionVault-Backend/2.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            certs = json.loads(response.read().decode("utf-8"))
            cache_control = response.headers.get("Cache-Control", "")
            max_age = 3600
            for part in cache_control.split(","):
                if "max-age=" in part:
                    try:
                        max_age = int(part.split("=")[1].strip())
                    except Exception:
                        pass
            _google_certs_cache = certs
            _google_certs_expires_at = now + max_age
            return certs
    except Exception as err:
        print(f"Failed to fetch Google public certs: {err}")
        return _google_certs_cache

def verify_firebase_id_token_public(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Invalid token: missing key ID (kid).")

        certs = get_google_public_keys()
        if kid not in certs:
            # Clear cache & retry once
            global _google_certs_expires_at
            _google_certs_expires_at = 0
            certs = get_google_public_keys()
            if kid not in certs:
                raise HTTPException(status_code=401, detail="Invalid token: signing key ID mismatch.")

        cert_str = certs[kid]
        public_key = RSAAlgorithm.from_jwk(cert_str) if cert_str.startswith("{") else cert_str

        decoded = jwt.decode(
            token,
            key=public_key,
            algorithms=["RS256"],
            audience=FIREBASE_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}"
        )
        uid = decoded.get("user_id") or decoded.get("sub") or decoded.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token payload: missing user UID.")
        decoded["uid"] = uid
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Firebase authentication token has expired.")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or unverified Firebase ID token: {str(e)}")

security_scheme = HTTPBearer(auto_error=False)

async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security_scheme)) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials were not provided. Authorization header missing."
        )

    token = credentials.credentials
    # 1. Primary: Verify via Firebase Admin SDK
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if uid:
            return decoded_token
    except Exception as e:
        print(f"Firebase Admin SDK verify_id_token fallback required: {e}")

    # 2. Resilient Fallback: Verify via Google RS256 Public X509 Certificates
    return verify_firebase_id_token_public(token)


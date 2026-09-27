from fastapi import APIRouter, Depends, HTTPException
from app.firebase_auth import verify_firebase_token
from app.firestore_service import get_user_files

router = APIRouter(prefix="/api/files", tags=["files"])

@router.get("")
async def list_files(token_data: dict = Depends(verify_firebase_token)):
    uid = token_data["uid"]
    try:
        user_files = get_user_files(uid)
        return {
            "status": "success",
            "files": user_files
        }
    except Exception as e:
        print(f"Error fetching files for user {uid}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user files: {str(e)}")

from fastapi import APIRouter, Depends
from app.firebase_auth import verify_firebase_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/me")
async def get_current_user_info(token_data: dict = Depends(verify_firebase_token)):
    return {
        "authenticated": True,
        "uid": token_data.get("uid"),
        "email": token_data.get("email"),
        "name": token_data.get("name")
    }

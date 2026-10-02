import os
import time
import uuid
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.firebase_auth import verify_firebase_token
from app.supabase_client import sanitize_filename, upload_file_to_supabase, get_signed_url_from_supabase, delete_file_from_supabase
from app.firestore_service import create_file_metadata, get_file_metadata, delete_file_metadata, log_activity

router = APIRouter(prefix="/api/storage", tags=["storage"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    source: str = Form("web"),
    token_data: dict = Depends(verify_firebase_token)
):
    uid = token_data["uid"]
    safe_filename = sanitize_filename(file.filename or "unnamed_file")
    
    file_id = f"fv_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}"
    storage_path = f"users/{uid}/files/{file_id}/{safe_filename}"
    
    try:
        contents = await file.read()
        checksum = hashlib.sha256(contents).hexdigest()
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # 1. Upload file to Supabase Storage private bucket
        upload_file_to_supabase(
            storage_path=storage_path,
            file_bytes=contents,
            content_type=file.content_type or "application/octet-stream"
        )
        
        # 2. Save metadata to Firestore
        file_doc_data = {
            "fileId": file_id,
            "ownerId": uid,
            "originalName": file.filename or safe_filename,
            "displayName": safe_filename,
            "extension": os.path.splitext(safe_filename)[1].lower(),
            "mimeType": file.content_type or "application/octet-stream",
            "size": len(contents),
            "storagePath": storage_path,
            "downloadURL": None, # Download URLs generated on-demand securely via API
            "source": source,
            "status": "completed",
            "checksum": checksum,
            "cvProcessed": False,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
        
        create_file_metadata(file_doc_data)
        
        # 3. Log activity
        log_activity(uid, "FILE_UPLOAD", f"Uploaded {safe_filename} to VisionVault", source)
        
        return {
            "status": "success",
            "fileId": file_id,
            "file": file_doc_data
        }
    except Exception as e:
        print(f"Error during upload_file API: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file upload: {str(e)}")

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    token_data: dict = Depends(verify_firebase_token)
):
    uid = token_data["uid"]
    
    file_doc = get_file_metadata(file_id)
    if not file_doc:
        raise HTTPException(status_code=404, detail="File document not found in VisionVault.")
    
    if file_doc.get("ownerId") != uid:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to access this file.")
    
    try:
        storage_path = file_doc["storagePath"]
        signed_url = get_signed_url_from_supabase(storage_path, expires_in=3600)
        
        log_activity(uid, "FILE_DOWNLOAD", f"Generated download link for {file_doc.get('originalName')}", "web")
        
        return {
            "fileId": file_id,
            "signedUrl": signed_url,
            "expiresIn": 3600,
            "fileName": file_doc.get("originalName")
        }
    except Exception as e:
        print(f"Error generating download link: {e}")
        raise HTTPException(status_code=500, detail=f"Download link generation failed: {str(e)}")

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    token_data: dict = Depends(verify_firebase_token)
):
    uid = token_data["uid"]
    
    file_doc = get_file_metadata(file_id)
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found.")
    
    if file_doc.get("ownerId") != uid:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this file.")
    
    try:
        # 1. Delete object from Supabase Storage
        delete_file_from_supabase(file_doc["storagePath"])
        
        # 2. Delete document from Firestore
        delete_file_metadata(file_id)
        
        # 3. Log activity
        log_activity(uid, "FILE_DELETE", f"Deleted {file_doc.get('originalName')}", "web")
        
        return {
            "status": "success",
            "message": "File deleted successfully",
            "fileId": file_id
        }
    except Exception as e:
        print(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=f"File deletion failed: {str(e)}")

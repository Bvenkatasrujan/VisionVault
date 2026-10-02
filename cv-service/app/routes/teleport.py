import os
import time
import uuid
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.firebase_auth import verify_firebase_token
from app.supabase_client import sanitize_filename, upload_file_to_supabase
from app.firestore_service import (
    create_teleport_job,
    update_teleport_job,
    create_file_metadata,
    log_activity,
    register_or_update_device
)

router = APIRouter(prefix="/api/teleport", tags=["teleport"])

@router.post("/upload")
async def teleport_upload(
    file: UploadFile = File(...),
    deviceId: str = Form("desktop_win"),
    token_data: dict = Depends(verify_firebase_token)
):
    uid = token_data["uid"]
    register_or_update_device(uid, deviceId)
    safe_filename = sanitize_filename(file.filename or "teleport_file")
    
    job_id = f"job_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    file_id = f"fv_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}"
    storage_path = f"users/{uid}/files/{file_id}/{safe_filename}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1. Initialize Teleport Job in Firestore (status: queued)
    job_doc = {
        "jobId": job_id,
        "ownerId": uid,
        "deviceId": deviceId,
        "fileId": file_id,
        "fileName": safe_filename,
        "source": "desktop",
        "status": "queued",
        "progress": 0,
        "createdAt": now_iso,
        "completedAt": None,
        "error": None
    }
    create_teleport_job(job_doc)
    
    try:
        # 2. Update status to uploading
        update_teleport_job(job_id, {"status": "uploading", "progress": 25})
        
        contents = await file.read()
        checksum = hashlib.sha256(contents).hexdigest()
        
        # 3. Upload file to Supabase Storage
        upload_file_to_supabase(
            storage_path=storage_path,
            file_bytes=contents,
            content_type=file.content_type or "application/octet-stream"
        )
        
        update_teleport_job(job_id, {"progress": 75, "status": "processing"})
        
        # 4. Create Firestore File Record
        file_doc_data = {
            "fileId": file_id,
            "ownerId": uid,
            "originalName": file.filename or safe_filename,
            "displayName": safe_filename,
            "extension": os.path.splitext(safe_filename)[1].lower(),
            "mimeType": file.content_type or "application/octet-stream",
            "size": len(contents),
            "storagePath": storage_path,
            "downloadURL": None,
            "source": "desktop",
            "status": "completed",
            "checksum": checksum,
            "cvProcessed": False,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
        create_file_metadata(file_doc_data)
        
        # 5. Mark teleport job completed
        update_teleport_job(job_id, {
            "status": "completed",
            "progress": 100,
            "completedAt": datetime.now(timezone.utc).isoformat()
        })
        
        # 6. Log activity
        log_activity(uid, "TELEPORT_COMPLETED", f"Teleported {safe_filename} from device {deviceId}", deviceId)
        
        return {
            "status": "completed",
            "jobId": job_id,
            "fileId": file_id,
            "file": file_doc_data
        }
        
    except Exception as e:
        print(f"Teleport upload failed for job {job_id}: {e}")
        update_teleport_job(job_id, {
            "status": "failed",
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"Teleport upload failed: {str(e)}")

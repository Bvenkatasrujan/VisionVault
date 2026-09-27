import time
from datetime import datetime, timezone
from firebase_admin import firestore
from typing import Optional, List, Dict, Any

_db_instance = None

def get_firestore_client():
    global _db_instance
    if _db_instance is None:
        _db_instance = firestore.client()
    return _db_instance

def _serialize_doc(doc_dict: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc_dict:
        return doc_dict
    res = {}
    for k, v in doc_dict.items():
        if hasattr(v, 'isoformat'):
            res[k] = v.isoformat()
        elif hasattr(v, 'seconds') and hasattr(v, 'nanoseconds'):
            res[k] = datetime.fromtimestamp(v.seconds, tz=timezone.utc).isoformat()
        else:
            res[k] = v
    return res

def create_file_metadata(file_doc: Dict[str, Any]) -> Dict[str, Any]:
    db = get_firestore_client()
    file_id = file_doc["fileId"]
    doc_ref = db.collection("files").document(file_id)
    doc_ref.set(file_doc)
    return file_doc

def get_file_metadata(file_id: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    doc_ref = db.collection("files").document(file_id)
    doc = doc_ref.get()
    if doc.exists:
        return _serialize_doc(doc.to_dict())
    return None

def delete_file_metadata(file_id: str) -> None:
    db = get_firestore_client()
    db.collection("files").document(file_id).delete()

def get_user_files(owner_id: str) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    query = db.collection("files").where("ownerId", "==", owner_id)
    docs = query.stream()
    result = []
    for doc in docs:
        d = _serialize_doc(doc.to_dict())
        d["id"] = doc.id
        result.append(d)
    return result

def create_teleport_job(job_doc: Dict[str, Any]) -> Dict[str, Any]:
    db = get_firestore_client()
    job_id = job_doc["jobId"]
    db.collection("teleportJobs").document(job_id).set(job_doc)
    return job_doc

def update_teleport_job(job_id: str, updates: Dict[str, Any]) -> None:
    db = get_firestore_client()
    db.collection("teleportJobs").document(job_id).update(updates)

def log_activity(owner_id: str, action: str, details: str, device_id: Optional[str] = None) -> None:
    db = get_firestore_client()
    log_id = f"log_{int(time.time()*1000)}"
    db.collection("activityLogs").document(log_id).set({
        "logId": log_id,
        "ownerId": owner_id,
        "action": action,
        "details": details,
        "deviceId": device_id or "web",
        "timestamp": firestore.SERVER_TIMESTAMP
    })

def register_or_update_device(owner_id: str, device_id: str, device_name: str = "Windows PC", platform: str = "windows", app_version: str = "1.0.0") -> None:
    try:
        db = get_firestore_client()
        doc_ref = db.collection("devices").document(device_id)
        doc_ref.set({
            "deviceId": device_id,
            "ownerId": owner_id,
            "deviceName": device_name,
            "platform": platform,
            "appVersion": app_version,
            "status": "online",
            "connectedAt": firestore.SERVER_TIMESTAMP,
            "lastSeenAt": firestore.SERVER_TIMESTAMP
        }, merge=True)
    except Exception as e:
        print(f"Warning: Failed to register device in Firestore: {e}")


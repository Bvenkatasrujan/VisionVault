import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from app.detector import VisionVaultCVEngine
from app.routes import storage, teleport, files, auth

app = FastAPI(
    title="VisionVault Backend API & CV Engine",
    description="Backend microservice handling Supabase Storage operations, file teleportation, and Computer Vision processing",
    version="2.0.0"
)

# Configure CORS origins for Vercel production website, local development, and Electron
ALLOWED_ORIGINS = [
    "https://visionvault-web.vercel.app",
    "https://visionvault.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Storage, Teleport, Files, and Auth Routers
app.include_router(storage.router)
app.include_router(teleport.router)
app.include_router(files.router)
app.include_router(auth.router)


cv_engine = VisionVaultCVEngine()

class CVProcessRequest(BaseModel):
    fileId: str
    ownerId: str
    fileName: str
    fileUrl: str
    processingType: str  # "object_detection" | "ocr"

class CVProcessResponse(BaseModel):
    resultId: str
    fileId: str
    ownerId: str
    processingType: str
    objects: List[dict]
    ocrText: Optional[str] = None
    confidence: float
    processedAt: str
    model: str

@app.get("/")
def health_check():
    return {
        "service": "VisionVault API & CV Engine",
        "status": "online",
        "version": "2.0.0",
        "model": cv_engine.model_version
    }

@app.post("/api/cv/process", response_model=CVProcessResponse)
def process_file_vision(request: CVProcessRequest):
    result_id = f"cv_{int(time.time())}_{request.fileId[:8]}"
    
    if request.processingType == "object_detection":
        detected_objects = cv_engine.analyze_image_objects(request.fileName)
        avg_confidence = sum(obj["confidence"] for obj in detected_objects) / len(detected_objects) if detected_objects else 0.90
        return CVProcessResponse(
            resultId=result_id,
            fileId=request.fileId,
            ownerId=request.ownerId,
            processingType="object_detection",
            objects=detected_objects,
            ocrText=None,
            confidence=round(avg_confidence, 2),
            processedAt=str(time.time()),
            model=cv_engine.model_version
        )
    
    elif request.processingType == "ocr":
        ocr_result = cv_engine.extract_document_ocr(request.fileName)
        return CVProcessResponse(
            resultId=result_id,
            fileId=request.fileId,
            ownerId=request.ownerId,
            processingType="ocr",
            objects=[{"label": "Document Text", "confidence": 0.96}],
            ocrText=ocr_result,
            confidence=0.96,
            processedAt=str(time.time()),
            model=cv_engine.model_version
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid processingType. Use 'object_detection' or 'ocr'.")

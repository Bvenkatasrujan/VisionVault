# VisionVault — Computer Vision Microservice Foundation

This microservice handles asynchronous Computer Vision jobs for VisionVault files (Object Detection & Document OCR).

## Architecture

```text
Firebase Storage (Image/Document)
       ↓
Python CV Service (FastAPI)
       ↓
OpenCV / YOLO / Tesseract OCR
       ↓
Firestore (cvResults/{resultId})
```

## Setup & Running Locally

1. Create Python Virtual Environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install Dependencies:
```bash
pip install -r requirements.txt
```

3. Run FastAPI Dev Server:
```bash
uvicorn app.main:app --reload --port 8000
```

4. API Endpoints:
- `GET /` : Health check & model version
- `POST /api/cv/process` : Trigger object detection or OCR parsing

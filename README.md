# VisionVault

> **Your Files. One Vault. Anywhere.**

VisionVault is an intelligent cloud file-management and cross-device file-teleportation platform powered by React, Electron, Firebase (`visionvault-5566b`), Supabase Storage (`visionvault-files`), and a foundation for Computer Vision intelligence.

---

## 1. System Architecture

```text
                                VISIONVAULT
                                     │
                  ┌──────────────────┴──────────────────┐
                  │                                     │
             WEB APP                               DESKTOP APP
       (React + Vite + Tailwind)             (Electron + React)
                  │                                     │
                  │                              BUILD: .EXE
                  │                                     │
                  └──────────────────┬──────────────────┘
                                     │
                           FIREBASE (visionvault-5566b)
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                AUTH             FIRESTORE           STORAGE
                  │                  │                  │
                  └──────────────────┼──────────────────┘
                                     │
                            USER'S CLOUD VAULT
                                     │
                         COMPUTER VISION SERVICE
                          (Python FastAPI + CV)
```

---

## 2. Directory Structure

```text
VisionVault/
├── web/                           # React + Vite Web Application
│   ├── src/
│   │   ├── components/            # Navbar, Sidebar, FileCard, DeviceCard, UploadModal
│   │   ├── pages/                 # Login, Register, ForgotPassword, Dashboard, FileManager, Devices, Settings
│   │   ├── context/               # AuthContext (Firebase authentication state)
│   │   ├── firebase/              # Firebase configuration & exports
│   │   ├── services/              # fileService, deviceService
│   │   └── utils/                 # fileHelpers
│   ├── package.json
│   └── vite.config.js
│
├── desktop/                       # Electron + React Desktop Application
│   ├── src/
│   │   ├── main/                  # Electron main process & IPC handlers
│   │   ├── renderer/              # React desktop UI (App.jsx, main.jsx)
│   │   ├── teleport/              # Teleport Engine
│   │   └── firebase/              # Desktop Firebase setup
│   ├── electron-builder.yml       # Windows setup.exe builder configuration
│   └── package.json
│
├── firebase/                      # Firebase Security Rules & Indexes
│   ├── firestore.rules            # User isolation rules
│   ├── storage.rules              # Storage path access rules
│   └── firestore.indexes.json     # Firestore collection indexes
│
├── cv-service/                    # Future Computer Vision Microservice Foundation
│   ├── app/                       # FastAPI application (main.py, detector.py)
│   ├── requirements.txt
│   └── README.md
│
├── README.md                      # Complete system documentation
└── .gitignore
```

---

## 3. Firebase Project & Security Setup

Project ID: `visionvault-5566b`

### Configuration (`firebase/`)

Firebase config pre-wired in `web/src/firebase/config.js` and `desktop/src/firebase/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCllYfvWTOAEWW1NP7sS9T42RCC_jVV-I4",
  authDomain: "visionvault-5566b.firebaseapp.com",
  projectId: "visionvault-5566b",
  storageBucket: "visionvault-5566b.firebasestorage.app",
  messagingSenderId: "896855686808",
  appId: "1:896855686808:web:009ac6de673e7e9ebd9aed",
  measurementId: "G-Q7QK5LNWJ1"
};
```

### Security Rules Highlights

- **Firestore (`firebase/firestore.rules`)**: User isolation enforcing `request.auth.uid == resource.data.ownerId` for `files/{fileId}`, `users/{uid}/devices/{deviceId}`, and `teleportJobs/{jobId}`.
- **Storage (`firebase/storage.rules`)**: Enforces `users/{uid}/files/{fileId}/{fileName}` to be accessible strictly by authenticated `{uid}`.

---

## 4. Ordinary File Teleportation

VisionVault's teleportation engine delivers direct, end-to-end file transfers. Any standard file is authenticated using Firebase ID Tokens, uploaded through the HTTPS FastAPI microservice (`cv-service`), validated, stored in private Supabase Storage (`visionvault-files`), and registered in Firestore metadata under the authenticated user's UID.

---

## 5. Running the Web Application

### Development Server

```bash
cd web
npm install
npm run dev
```

The website will be available at: `http://localhost:3000`

### Production Build

```bash
cd web
npm run build
```

---

## 6. Running & Building the Desktop Application

### Development Mode

```bash
cd desktop
npm install
npm run dev
```

### Building Windows Executable (`.exe`)

```bash
cd desktop
npm run build
```

or explicitly for Windows NSIS target:

```bash
cd desktop
npm run dist
```

### Generated Executable Location

The compiled Windows installer package will be output to:

```text
desktop/build_output/VisionVault Setup.exe
```

---

## 7. Computer Vision Service Foundation (`cv-service/`)

The CV service allows image object detection and OCR text extraction.

### Quick Start

```bash
cd cv-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 8. First Working MVP Walkthrough

1. Open VisionVault Web app (`http://localhost:3000`).
2. Register a new account (e.g. `user@example.com`).
3. View the Dashboard showing storage metrics and welcome header.
4. Upload a test file (e.g., `project.pdf`).
5. Verify file appears in Firestore `files/` collection and Storage bucket.
6. Launch VisionVault Desktop app.
7. Log in with `user@example.com`.
8. Desktop displays `🟢 Connected` and registers device in Firestore under `users/{uid}/devices/`.
9. Click **[ TELEPORT FILE ]** in Desktop app.
10. Select `image.png`.
11. File is uploaded to Firebase/Supabase with `source: "desktop"`.
12. Web dashboard updates automatically via Firestore real-time listener showing `image.png`.
13. Download file securely from the website.

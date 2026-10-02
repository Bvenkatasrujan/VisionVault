# VisionVault — Firebase Deployment & Configuration Guide

This directory contains the Firebase rules, indexes, and setup reference for VisionVault.

## Firebase Project Information

- **Project ID**: `visionvault-5566b`
- **Auth Domain**: `visionvault-5566b.firebaseapp.com`
- **Storage Bucket**: `visionvault-5566b.firebasestorage.app`

## Firestore Data Architecture

### 1. `users` Collection (`users/{uid}`)
```json
{
  "uid": "USER_UID",
  "displayName": "User Name",
  "email": "user@example.com",
  "photoURL": null,
  "createdAt": "serverTimestamp()",
  "updatedAt": "serverTimestamp()"
}
```

### 2. `files` Collection (`files/{fileId}`)
```json
{
  "fileId": "UNIQUE_FILE_ID",
  "ownerId": "USER_UID",
  "originalName": "document.pdf",
  "displayName": "document.pdf",
  "extension": ".pdf",
  "mimeType": "application/pdf",
  "size": 1048576,
  "storagePath": "users/USER_UID/files/UNIQUE_FILE_ID/document.pdf",
  "downloadURL": "https://firebasestorage.googleapis.com/...",
  "source": "web | desktop",
  "status": "uploaded",
  "cvProcessed": false,
  "cvMetadata": null,
  "createdAt": "serverTimestamp()",
  "updatedAt": "serverTimestamp()"
}
```

### 3. `devices` Subcollection (`users/{uid}/devices/{deviceId}`)
```json
{
  "deviceId": "DEVICE_ID",
  "deviceName": "My Windows Workstation",
  "platform": "windows | mac | linux",
  "appVersion": "1.0.0",
  "status": "online | offline",
  "createdAt": "serverTimestamp()",
  "lastSeenAt": "serverTimestamp()",
  "connectedAt": "serverTimestamp()"
}
```

### 4. `teleportJobs` Collection (`teleportJobs/{jobId}`)
```json
{
  "jobId": "JOB_ID",
  "ownerId": "USER_UID",
  "deviceId": "DEVICE_ID",
  "fileId": "FILE_ID",
  "fileName": "image.png",
  "status": "queued | uploading | processing | completed | failed | cancelled",
  "source": "desktop",
  "createdAt": "serverTimestamp()",
  "completedAt": "serverTimestamp()",
  "error": null
}
```

## Security Rules Deployment

To deploy rules using Firebase CLI:

```bash
firebase deploy --only firestore:rules,storage
```

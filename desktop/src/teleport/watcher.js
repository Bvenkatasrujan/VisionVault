/**
 * Automatic VLT Teleport File Watcher Foundation
 */

export class VltDirectoryWatcher {
  constructor(onVltFileDetected) {
    this.enabled = false;
    this.onVltFileDetected = onVltFileDetected;
  }

  enable() {
    this.enabled = true;
    console.log("[VLT Watcher] Automatic VLT Detector turned ON");
  }

  disable() {
    this.enabled = false;
    console.log("[VLT Watcher] Automatic VLT Detector turned OFF");
  }

  isEnabled() {
    return this.enabled;
  }

  simulateIncomingVlt(file) {
    if (this.enabled && this.onVltFileDetected) {
      this.onVltFileDetected(file);
    }
  }
}

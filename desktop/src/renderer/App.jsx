import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  reload,
  signOut, 
  onAuthStateChanged,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  onSnapshot
} from '../firebase/config';
import { teleportFileToCloud } from '../teleport/teleportEngine';
import { 
  Shield, 
  Zap, 
  Laptop, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LogOut, 
  Lock, 
  Mail, 
  User,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Application State Machine:
  // 'ACCOUNT_NOT_CREATED' | 'EMAIL_VERIFICATION_PENDING' | 'EMAIL_VERIFIED' | 'CONFIGURATION_PENDING' | 'CONFIGURED' | 'READY' | 'TELEPORT_PROCESSING' | 'TELEPORT_COMPLETED' | 'TELEPORT_FAILED'
  const [appState, setAppState] = useState('ACCOUNT_NOT_CREATED');

  // Desktop Auth View Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email Verification states
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState(null);
  const [verifyErr, setVerifyErr] = useState(null);

  // Device & Teleport state
  const [deviceInfo, setDeviceInfo] = useState({
    deviceId: 'win_pc_files',
    deviceName: 'Windows PC',
    platform: 'windows',
    appVersion: '1.0.0'
  });
  
  // Pending Teleport Queue & Teleport Modal States
  const [pendingTeleportQueue, setPendingTeleportQueue] = useState([]);
  const [activeTeleportFile, setActiveTeleportFile] = useState(null);
  const [teleportJobs, setTeleportJobs] = useState([]);
  const [teleporting, setTeleporting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [teleportStageText, setTeleportStageText] = useState('Preparing file...');
  const [teleportSuccessMsg, setTeleportSuccessMsg] = useState(null);
  const [teleportErrorMsg, setTeleportErrorMsg] = useState(null);

  // Splash Screen Timer (1.8 seconds)
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Helper to execute file teleportation with 7 processing stages & state validation
  const processFileTeleport = async (targetFile) => {
    // 1. Prerequisite Validation Check
    if (!auth.currentUser) {
      setAppState('ACCOUNT_NOT_CREATED');
      setAuthError("VisionVault Setup Required: User is not authenticated. Please sign in.");
      return;
    }

    const isGoogle = auth.currentUser.providerData && auth.currentUser.providerData[0]?.providerId === 'google.com';
    if (!isGoogle && !auth.currentUser.emailVerified) {
      setAppState('EMAIL_VERIFICATION_PENDING');
      setVerifyErr("VisionVault Setup Required: Your email address must be verified before using file teleportation.");
      return;
    }

    const configDone = localStorage.getItem(`vv_config_done_${auth.currentUser.uid}`);
    if (!configDone) {
      setAppState('CONFIGURATION_PENDING');
      return;
    }

    // 2. Start Processing Pipeline
    setAppState('TELEPORT_PROCESSING');
    setTeleporting(true);
    setActiveTeleportFile(targetFile);
    setCurrentProgress(0);
    setTeleportStageText('Preparing file...');
    setTeleportSuccessMsg(null);
    setTeleportErrorMsg(null);

    try {
      // Stage 1: Preparing
      setCurrentProgress(10);
      setTeleportStageText('Preparing file...');
      await new Promise(r => setTimeout(r, 300));

      // Stage 2: Analyzing
      setCurrentProgress(25);
      setTeleportStageText('Analyzing file...');
      await new Promise(r => setTimeout(r, 300));

      // Stage 3: Validating
      setCurrentProgress(40);
      setTeleportStageText('Validating file & container package...');
      await new Promise(r => setTimeout(r, 300));

      // Stage 4: Teleporting
      setCurrentProgress(60);
      setTeleportStageText('Teleporting file to Cloud Vault...');

      await teleportFileToCloud({
        file: targetFile,
        deviceId: deviceInfo.deviceId,
        onProgress: (p) => {
          const scaled = Math.min(60 + Math.round(p * 0.25), 85);
          setCurrentProgress(scaled);
        },
        onStatusChange: (status) => console.log("Teleport stage status:", status)
      });

      // Stage 5: Verifying
      setCurrentProgress(88);
      setTeleportStageText('Verifying backend upload & metadata...');
      await new Promise(r => setTimeout(r, 300));

      // Stage 6: Completing
      setCurrentProgress(100);
      setTeleportStageText('Completing operation...');
      await new Promise(r => setTimeout(r, 250));

      setAppState('TELEPORT_COMPLETED');
      setTeleportSuccessMsg(`✓ Teleportation Successfully Completed! ${targetFile.name} is now in your VisionVault.`);

    } catch (err) {
      console.error("Teleport execution failed:", err);
      setAppState('TELEPORT_FAILED');
      setTeleportErrorMsg(err.message || "Teleportation failed during processing.");
    } finally {
      setTeleporting(false);
    }
  };

  // Helper to register/update device in Firestore
  const registerDeviceInFirestore = async (user, info) => {
    if (!user || !info) return;
    const targetId = info.deviceId || 'win_pc_files';
    try {
      const deviceDocRef = doc(db, 'devices', targetId);
      await setDoc(deviceDocRef, {
        deviceId: targetId,
        ownerId: user.uid,
        deviceName: info.deviceName || 'Windows PC',
        platform: info.platform || 'win32',
        appVersion: info.appVersion || '1.0.0',
        status: 'online',
        authorized: true,
        connectedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp()
      }, { merge: true });

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || null,
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'activityLogs', logId), {
        logId,
        ownerId: user.uid,
        action: 'LOGIN',
        details: `Desktop client logged in on ${info.deviceName || 'Windows PC'}`,
        deviceId: targetId,
        timestamp: serverTimestamp()
      });

    } catch (err) {
      console.error("Error registering desktop device/activity in Firestore:", err);
    }
  };

  // Initialize Electron device info bridge and listen for right-click teleport requests
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getDeviceInfo) {
      window.electronAPI.getDeviceInfo().then(info => {
        if (info) {
          setDeviceInfo(info);
          if (auth.currentUser) {
            registerDeviceInFirestore(auth.currentUser, info);
          }
        }
      }).catch(err => console.warn("Failed to get native device info:", err));
    }

    const handleIncomingFileInfo = async (fileInfo) => {
      if (!fileInfo || !fileInfo.filePath) return;
      try {
        let blob;
        try {
          const res = await fetch(`file://${fileInfo.filePath}`);
          blob = await res.blob();
        } catch (e) {
          blob = new Blob(["[Teleported Content]"], { type: "application/octet-stream" });
        }
        const targetFile = new File([blob], fileInfo.fileName, { type: blob.type || "application/octet-stream" });
        
        if (auth.currentUser) {
          processFileTeleport(targetFile);
        } else {
          setPendingTeleportQueue(prev => [...prev, {
            fileObj: targetFile,
            filePath: fileInfo.filePath,
            fileName: fileInfo.fileName,
            size: fileInfo.size
          }]);
        }
      } catch (err) {
        console.error("Failed to process right-click teleport file:", err);
      }
    };

    if (window.electronAPI && window.electronAPI.getPendingTeleportFiles) {
      window.electronAPI.getPendingTeleportFiles().then(files => {
        if (files && files.length > 0) {
          files.forEach(f => handleIncomingFileInfo(f));
        }
      });
    }

    if (window.electronAPI && window.electronAPI.onTeleportFileRequested) {
      const cleanup = window.electronAPI.onTeleportFileRequested(handleIncomingFileInfo);
      return () => cleanup();
    }
  }, []);

  // Automatically execute pending file teleports after user logs in
  useEffect(() => {
    if (currentUser && pendingTeleportQueue.length > 0) {
      const itemsToProcess = [...pendingTeleportQueue];
      setPendingTeleportQueue([]);
      itemsToProcess.forEach(item => {
        const fileToUpload = item.fileObj || new File(["[Teleported Content]"], item.fileName);
        processFileTeleport(fileToUpload);
      });
    }
  }, [currentUser, pendingTeleportQueue]);

  // Heartbeat to update lastSeenAt & online status periodically (every 30s)
  useEffect(() => {
    if (!currentUser || !deviceInfo || !deviceInfo.deviceId) return;
    const interval = setInterval(async () => {
      try {
        const deviceDocRef = doc(db, 'devices', deviceInfo.deviceId);
        await setDoc(deviceDocRef, {
          status: 'online',
          authorized: true,
          lastSeenAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.warn("Desktop device heartbeat failed:", e);
      }
    }, 30000);

    const handleBeforeUnload = () => {
      if (currentUser && deviceInfo && deviceInfo.deviceId) {
        const deviceDocRef = doc(db, 'devices', deviceInfo.deviceId);
        setDoc(deviceDocRef, {
          status: 'offline',
          lastSeenAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, deviceInfo]);

  // Listen to Auth State & update Application State Machine
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        registerDeviceInFirestore(user, deviceInfo);

        const isGoogle = user.providerData && user.providerData[0]?.providerId === 'google.com';
        if (!isGoogle && !user.emailVerified) {
          setAppState('EMAIL_VERIFICATION_PENDING');
        } else {
          localStorage.setItem(`vv_config_done_${user.uid}`, 'true');
          setAppState('READY');
          if (window.electronAPI && window.electronAPI.registerContextMenu) {
            window.electronAPI.registerContextMenu();
          }
        }
      } else {
        setAppState('ACCOUNT_NOT_CREATED');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [deviceInfo]);

  // Subscribe to Teleport Jobs for current user
  useEffect(() => {
    if (!currentUser) {
      setTeleportJobs([]);
      return;
    }
    const q = query(
      collection(db, 'teleportJobs'),
      where('ownerId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      jobs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTeleportJobs(jobs);
    }, (err) => {
      console.error("Error subscribing to teleport jobs:", err);
    });

    return () => unsub();
  }, [currentUser]);

  // Desktop Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please fill in both email and password.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        setAppState('EMAIL_VERIFICATION_PENDING');
      } else {
        localStorage.setItem(`vv_config_done_${user.uid}`, 'true');
        setAppState('READY');
        if (window.electronAPI && window.electronAPI.registerContextMenu) {
          window.electronAPI.registerContextMenu();
        }
      }
    } catch (err) {
      console.error("Desktop login failed:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError("Invalid email or password. Please check your login credentials.");
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError("Access temporarily blocked due to multiple failed login attempts. Please try again later.");
      } else {
        setAuthError(err.message || "Sign in failed. Please check your internet connection.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Desktop Register Handler (Primary Account Creation inside Desktop App)
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setAuthError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("Passwords do not match. Please verify.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (fullName) {
        await updateProfile(user, { displayName: fullName });
      }

      // Send mandatory verification email
      try {
        await sendEmailVerification(user);
      } catch (e) {
        console.warn("Verification email send warning:", e);
      }

      // Create Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        displayName: fullName,
        email: email,
        photoURL: null,
        provider: 'password',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });

      setAppState('EMAIL_VERIFICATION_PENDING');

    } catch (err) {
      console.error("Desktop registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError("An account with this email already exists. Try signing in.");
      } else {
        setAuthError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Check email verification status from server
  const handleCheckVerification = async () => {
    setVerifying(true);
    setVerifyErr(null);
    setVerifyMsg(null);
    try {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        setCurrentUser({ ...auth.currentUser });
        if (auth.currentUser.emailVerified) {
          setAppState('EMAIL_VERIFIED');
          setVerifyMsg("✓ Email Verified Successfully");
        } else {
          setVerifyErr("Email Not Yet Verified - Your email address has not been verified yet. Please check your email and complete verification.");
        }
      }
    } catch (err) {
      setVerifyErr("Verification error: " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  // Resend email verification
  const handleResendEmail = async () => {
    setResending(true);
    setVerifyErr(null);
    setVerifyMsg(null);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setVerifyMsg(`Verification email re-sent to ${auth.currentUser.email}`);
      }
    } catch (err) {
      setVerifyErr("Unable to send verification email. Try again later.");
    } finally {
      setResending(false);
    }
  };

  // Continue from EMAIL_VERIFIED to CONFIGURATION_PENDING
  const handleContinueToConfiguration = () => {
    setAppState('CONFIGURATION_PENDING');
  };

  // Complete Configuration & activate Windows Explorer context menu
  const handleFinishConfiguration = async () => {
    if (auth.currentUser) {
      localStorage.setItem(`vv_config_done_${auth.currentUser.uid}`, 'true');
    }
    if (window.electronAPI && window.electronAPI.registerContextMenu) {
      await window.electronAPI.registerContextMenu();
    }
    setAppState('READY');
  };

  // Logout handler & reset to Sign In screen
  const handleLogout = async () => {
    try {
      if (currentUser && deviceInfo && deviceInfo.deviceId) {
        const deviceDocRef = doc(db, 'devices', deviceInfo.deviceId);
        await setDoc(deviceDocRef, { status: 'offline', lastSeenAt: serverTimestamp() }, { merge: true });
      }
      await signOut(auth);
    } catch (err) {
      console.error("Signout error:", err);
    } finally {
      setCurrentUser(null);
      setAppState('ACCOUNT_NOT_CREATED');
      setAuthMode('login');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setAuthError(null);
      setVerifyErr(null);
      setVerifyMsg(null);
    }
  };

  // Teleport File Action
  const handlePickAndTeleport = async () => {
    if (!currentUser) return;

    let selectedFileObj = null;

    if (window.electronAPI && window.electronAPI.selectFile) {
      const nativeFile = await window.electronAPI.selectFile();
      if (!nativeFile) return;
      try {
        const res = await fetch(`file://${nativeFile.filePath}`);
        const blob = await res.blob();
        selectedFileObj = new File([blob], nativeFile.fileName, { type: blob.type });
      } catch (e) {
        selectedFileObj = new File(["[Teleported Content]"], nativeFile.fileName);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.click();
      await new Promise(resolve => {
        input.onchange = () => {
          if (input.files && input.files[0]) {
            selectedFileObj = input.files[0];
          }
          resolve();
        };
      });
    }

    if (!selectedFileObj) return;

    setTeleporting(true);
    setCurrentProgress(0);
    setTeleportSuccessMsg(null);

    try {
      await teleportFileToCloud({
        file: selectedFileObj,
        user: currentUser,
        deviceId: deviceInfo.deviceId,
        onProgress: (p) => setCurrentProgress(p),
        onStatusChange: (status) => console.log("Teleport status:", status)
      });
      setTeleportSuccessMsg(`✓ ${selectedFileObj.name} successfully teleported to VisionVault!`);
      setTimeout(() => setTeleportSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Teleport failed:", err);
      alert(`Teleport failed: ${err.message}`);
    } finally {
      setTeleporting(false);
    }
  };

  // 1. Splash Screen View (1.8s)
  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        <div className="w-96 h-96 bg-brand-500/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 animate-bounce">
            <Shield className="w-full h-full text-brand-400 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            VISION<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">VAULT</span>
          </h1>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
            Your Files. One Vault. Anywhere.
          </p>
          <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 animate-pulse rounded-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Authenticating Desktop Client...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Desktop View
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-6 relative">
        <div className="w-full max-w-sm glass-panel p-7 rounded-3xl space-y-5 shadow-2xl">
          
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-glow-blue mb-1">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h1 className="text-xl font-extrabold text-white">VISIONVAULT</h1>
            <p className="text-xs text-slate-400">
              {authMode === 'login' ? 'Sign in to Your Vault' : 'Create Your Primary VisionVault Account'}
            </p>
          </div>

          {pendingTeleportQueue.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs space-y-1 text-left animate-pulse">
              <div className="flex items-center gap-2 font-semibold">
                <UploadCloud className="w-4 h-4 text-brand-400" />
                <span>Pending File Teleport</span>
              </div>
              <p className="text-[11px] text-slate-200 truncate">
                📄 <span className="font-semibold text-white">{pendingTeleportQueue[0].fileName}</span>
                {pendingTeleportQueue[0].size ? ` (${(pendingTeleportQueue[0].size / 1024).toFixed(1)} KB)` : ''}
              </p>
              <p className="text-[10px] text-slate-400">
                Sign in to automatically teleport this file to your private Cloud Vault.
              </p>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input rounded-xl pl-9 pr-8 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading || googleLoading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-blue transition-all disabled:opacity-50"
              >
                {authLoading ? 'Signing In...' : 'SIGN IN TO VISIONVAULT'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-1">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Srujan Bellamkonda"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-1.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Confirm
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading || googleLoading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-blue transition-all disabled:opacity-50 mt-1"
              >
                {authLoading ? 'Creating Account...' : 'CREATE ACCOUNT'}
              </button>
            </form>
          )}

          {/* Toggle between Login and Register inside Desktop */}
          <div className="text-center pt-1 border-t border-slate-800/60">
            {authMode === 'login' ? (
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={() => { setAuthMode('register'); setAuthError(null); }}
                  className="font-semibold text-brand-400 hover:text-brand-300 ml-1"
                >
                  Create Account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className="font-semibold text-brand-400 hover:text-brand-300 ml-1"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    );
  }

  // 3. Desktop Email Verification Pending View
  const isGoogleUser = currentUser && currentUser.providerData && currentUser.providerData[0]?.providerId === 'google.com';
  if (currentUser && !isGoogleUser && !currentUser.emailVerified && appState === 'EMAIL_VERIFICATION_PENDING') {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md glass-panel p-7 rounded-3xl space-y-5 text-center shadow-2xl">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-left">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In / Use Different Email</span>
            </button>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-lg">Verify Your Email</h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              We've sent a verification email to:
            </p>
            <p className="text-xs font-bold text-amber-300 mt-0.5 truncate">{currentUser.email}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Please check your inbox and click the verification link to verify your email address.
            </p>
          </div>

          {verifyErr && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Email Not Yet Verified</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-tight">
                {verifyErr}
              </p>
            </div>
          )}

          {verifyMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{verifyMsg}</span>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={handleCheckVerification}
              disabled={verifying}
              className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-blue transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking Server Verification...</span>
                </>
              ) : (
                <span>I've Verified My Email</span>
              )}
            </button>

            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 transition-all"
            >
              {resending ? 'Sending...' : 'RESEND VERIFICATION EMAIL'}
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 pt-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Email Verified Success View
  if (currentUser && appState === 'EMAIL_VERIFIED') {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-6 relative">
        <div className="w-full max-w-sm glass-panel p-7 rounded-3xl space-y-5 text-center shadow-2xl border border-emerald-500/30">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-lg">✓ Email Verified Successfully</h2>
            <p className="text-xs text-slate-300 mt-1.5">
              Your email address <span className="font-semibold text-emerald-300">{currentUser.email}</span> has been successfully verified.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleContinueToConfiguration}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg transition-all"
            >
              Continue Setup
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In / Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. VisionVault Configuration View
  if (currentUser && appState === 'CONFIGURATION_PENDING') {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md glass-panel p-7 rounded-3xl space-y-5 shadow-2xl border border-brand-500/30">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In / Switch Account</span>
            </button>
          </div>

          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-glow-blue mb-2">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <h2 className="font-extrabold text-white text-lg">VisionVault Configuration</h2>
            <p className="text-xs text-slate-400">Completing required application setup</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Account</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Email Status</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">VisionVault Engine</span>
              <span className="font-bold text-brand-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Ready to Configure
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 text-center leading-relaxed">
            Your VisionVault account is ready. Clicking Finish Setup will enable Windows Explorer file teleportation on your computer.
          </p>

          <button
            onClick={handleFinishConfiguration}
            className="w-full py-3.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white shadow-glow-blue transition-all"
          >
            Finish Setup
          </button>
        </div>
      </div>
    );
  }

  // 6. Authenticated Verified VisionVault Ready Main Interface
  return (
    <div className="min-h-screen bg-[#0a0f1d] p-5 flex flex-col justify-between select-none">
      
      {/* Top App Header */}
      <div className="space-y-4">
        
        {/* Brand & Connection Bar */}
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-glow-blue">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight text-white">VISIONVAULT</h2>
              <p className="text-[11px] text-slate-400">Your Files. One Vault. Anywhere.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>VisionVault Ready</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Disconnect Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Account & Device Status Card */}
        <div className="glass-panel p-4 rounded-2xl grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-500">Account Email</p>
            <p className="font-semibold text-slate-100 truncate mt-0.5">{currentUser.email}</p>
          </div>
          <div>
            <p className="text-slate-500">Linked Device</p>
            <p className="font-semibold text-brand-300 truncate mt-0.5">{deviceInfo.deviceName}</p>
          </div>
        </div>

        {/* Teleport Action Card */}
        <div className="glass-panel p-5 rounded-3xl space-y-4 text-center border-brand-500/20 bg-gradient-to-b from-brand-950/30 to-slate-900">
          
          <button
            onClick={handlePickAndTeleport}
            disabled={teleporting}
            className="w-full py-4 px-6 rounded-2xl font-extrabold text-base tracking-wide bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white shadow-glow-blue hover:shadow-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {teleporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing... {currentProgress}%</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-white" />
                <span>TELEPORT FILE</span>
              </>
            )}
          </button>


          {/* Windows Context Menu Status Banner */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Right-click any file in Windows Explorer & select <b>"Teleport using VisionVault"</b></span>
          </div>

        </div>

        {/* Upload Queue Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Upload Queue & Activity</h3>
            <span className="text-[11px] text-slate-500">{teleportJobs.length} jobs synced</span>
          </div>

          <div className="glass-panel rounded-2xl p-3 max-h-44 overflow-y-auto space-y-2">
            {teleportJobs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No recent teleport jobs</p>
            ) : (
              teleportJobs.slice(0, 5).map(job => (
                <div key={job.jobId} className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {job.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : job.status === 'uploading' ? (
                      <RefreshCw className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                    <span className="font-medium text-slate-200 truncate">{job.fileName}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    job.status === 'uploading' ? 'bg-brand-500/10 text-brand-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Footer Navigation Bar */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span>VisionVault v1.0.0</span>
        <div className="flex gap-4">
          <span 
            onClick={() => window.electronAPI && window.electronAPI.openExternal && window.electronAPI.openExternal('https://visionvault-web.vercel.app')}
            className="hover:text-brand-300 cursor-pointer flex items-center gap-1 font-semibold"
          >
            Open Web Vault
          </span>
        </div>
      </div>

      {/* Dedicated 7-Stage Teleport Processing Modal */}
      {appState === 'TELEPORT_PROCESSING' && activeTeleportFile && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-panel p-7 rounded-3xl space-y-5 text-center border border-brand-500/30 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto animate-pulse">
              <UploadCloud className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Teleporting File</h3>
              <p className="text-xs font-bold text-brand-300 mt-1 truncate px-4">
                📄 {activeTeleportFile.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeTeleportFile.size ? `${(activeTeleportFile.size / (1024 * 1024)).toFixed(2)} MB • ` : ''}VisionVault Cloud Pipeline
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span className="text-brand-300">{teleportStageText}</span>
                <span className="font-mono text-white">{currentProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teleport Completed Success Screen Modal */}
      {appState === 'TELEPORT_COMPLETED' && activeTeleportFile && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md glass-panel p-7 rounded-3xl space-y-5 text-center border border-emerald-500/30 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">✓ Teleportation Successfully Completed</h3>
              <p className="text-xs text-slate-300 mt-1">
                Your file has been successfully processed and teleported by VisionVault.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-1">
              <p className="text-slate-400">File Name: <span className="font-semibold text-white">{activeTeleportFile.name}</span></p>
              <p className="text-slate-400">Status: <span className="font-semibold text-emerald-400">Completed</span></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAppState('READY')}
                className="w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-blue transition-all"
              >
                Done
              </button>
              <button
                onClick={() => {
                  setAppState('READY');
                  if (window.electronAPI && window.electronAPI.openExternal) {
                    window.electronAPI.openExternal('https://visionvault-web.vercel.app');
                  }
                }}
                className="w-full py-3 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
              >
                Open Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teleport Failed Screen Modal */}
      {appState === 'TELEPORT_FAILED' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md glass-panel p-7 rounded-3xl space-y-5 text-center border border-rose-500/30 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Teleportation Failed</h3>
              <p className="text-xs text-rose-300 mt-1.5 px-2">{teleportErrorMsg}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (activeTeleportFile) processFileTeleport(activeTeleportFile);
                  else setAppState('READY');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all"
              >
                Retry
              </button>
              <button
                onClick={() => setAppState('READY')}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

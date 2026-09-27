import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider,
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendEmailVerification,
  reload,
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from '../firebase/config';

import { registerOrUpdateDevice } from '../services/deviceService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Friendly error messages mapping
export const getFriendlyAuthErrorMessage = (error) => {
  if (!error || !error.code) return 'An unexpected error occurred. Please try again.';
  
  switch (error.code) {
    case 'auth/invalid-email':
      return 'The email address format is invalid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    default:
      return error.message || 'Authentication failed.';
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile from Firestore users/{uid}
  const syncUserProfile = async (user, defaultProvider = 'password') => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        setUserProfile(snapshot.data());
      } else {
        const provider = user.providerData && user.providerData[0] ? user.providerData[0].providerId.replace('.com', '') : defaultProvider;
        const newProfile = {
          uid: user.uid,
          displayName: user.displayName || user.email.split('@')[0],
          email: user.email,
          photoURL: user.photoURL || null,
          provider: provider === 'google' ? 'google' : 'password',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error('Error syncing user profile in Firestore:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserProfile(user);
        const webDeviceId = `web_${user.uid.substring(0, 8)}`;
        registerOrUpdateDevice(user.uid, {
          deviceId: webDeviceId,
          deviceName: `Web Client (${navigator.platform.includes('Mac') ? 'macOS' : 'Windows'})`,
          platform: navigator.platform.includes('Mac') ? 'mac' : 'windows',
          appVersion: '1.0.0 (Web)'
        }).catch(err => console.warn("Failed to register web device:", err));
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Signup with Email & Password
  const signup = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Automatically send Email Verification
    try {
      await sendEmailVerification(user);
    } catch (err) {
      console.warn("Failed to send initial verification email:", err);
    }

    // Save profile to Firestore
    const userRef = doc(db, 'users', user.uid);
    const profileData = {
      uid: user.uid,
      displayName: displayName || email.split('@')[0],
      email: email,
      photoURL: null,
      provider: 'password',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, profileData);
    setUserProfile(profileData);

    return userCredential;
  };

  // Login with Email & Password
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await syncUserProfile(userCredential.user, 'password');
    return userCredential;
  };

  // Login with Google Auth Provider
  const loginWithGoogle = async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(userCredential.user, 'google');
    return userCredential;
  };

  // Resend Email Verification
  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  // Reload and check if email is verified
  const checkVerificationStatus = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setCurrentUser({ ...auth.currentUser });
      return auth.currentUser.emailVerified;
    }
    return false;
  };

  const logout = () => {
    return signOut(auth);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    resendVerificationEmail,
    checkVerificationStatus,
    logout,
    resetPassword,
    getFriendlyAuthErrorMessage
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

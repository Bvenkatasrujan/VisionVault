import { auth } from '../firebase/config';

export function getCurrentFirebaseUser() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Unauthenticated: Please sign in to VisionVault before performing this action.");
  }
  return user;
}

export async function getCurrentFirebaseIdToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Unauthenticated: Please sign in to VisionVault before performing this action.");
  }
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error("Failed to obtain Firebase ID Token:", err);
    throw new Error(`Authentication token error: ${err.message}`);
  }
}

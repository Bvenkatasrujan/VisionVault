import { 
  db, 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  setDoc, 
  serverTimestamp 
} from '../firebase/config';

export const subscribeUserDevices = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'devices'),
    where('ownerId', '==', uid)
  );

  return onSnapshot(q, (snapshot) => {
    const devices = snapshot.docs
      .map(docSnap => ({
        deviceId: docSnap.id,
        ...docSnap.data()
      }))
      .filter(device => device.authorized !== false);
    callback(devices);
  }, (err) => {
    console.error("Error subscribing to user devices:", err);
  });
};

export const disconnectDevice = async (uid, deviceId) => {
  if (!uid || !deviceId) return;
  const deviceDocRef = doc(db, 'devices', deviceId);
  await setDoc(deviceDocRef, {
    authorized: false,
    status: 'offline',
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const registerOrUpdateDevice = async (uid, deviceData) => {
  if (!uid || !deviceData.deviceId) return;
  const deviceDocRef = doc(db, 'devices', deviceData.deviceId);
  
  await setDoc(deviceDocRef, {
    deviceId: deviceData.deviceId,
    ownerId: uid,
    deviceName: deviceData.deviceName || 'Desktop Client',
    platform: deviceData.platform || 'win32',
    appVersion: deviceData.appVersion || '1.0.0',
    status: 'online',
    authorized: true,
    lastSeenAt: serverTimestamp(),
    connectedAt: deviceData.connectedAt || serverTimestamp()
  }, { merge: true });
};


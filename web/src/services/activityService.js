import { db, doc, setDoc, serverTimestamp, collection, query, where, onSnapshot } from '../firebase/config';

export const logActivity = async ({
  uid,
  action,
  details,
  deviceId = 'web'
}) => {
  if (!uid || !action) return;

  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const logRef = doc(db, 'activityLogs', logId);

  try {
    await setDoc(logRef, {
      logId,
      ownerId: uid,
      action,
      details: details || '',
      deviceId,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn("Failed to log activity event:", err);
  }
};

export const subscribeUserActivity = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'activityLogs'),
    where('ownerId', '==', uid)
  );

  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    logs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    callback(logs);
  }, (err) => {
    console.error("Error subscribing to activity logs:", err);
  });
};

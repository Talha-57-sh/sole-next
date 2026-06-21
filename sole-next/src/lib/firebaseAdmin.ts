import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase Admin Initialization Error:', error);
    }
  }
}

export const getAdminDb = () => {
  if (!admin.apps.length) throw new Error('Firebase Admin is not initialized.');
  return admin.firestore();
};

export const getAdminAuth = () => {
  if (!admin.apps.length) throw new Error('Firebase Admin is not initialized.');
  return admin.auth();
};

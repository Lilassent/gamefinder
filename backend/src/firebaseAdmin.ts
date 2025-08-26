import admin from 'firebase-admin';

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
if (!admin.apps.length) {
  if (!b64) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_B64 not set – Google login will not work');
  } else {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const creds = JSON.parse(json);
    admin.initializeApp({
      credential: admin.credential.cert(creds),
    });
  }
}

export { admin };

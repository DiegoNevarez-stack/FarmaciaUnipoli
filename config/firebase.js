const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
  console.log('✅ Usando serviceAccountKey.json');
} catch (e) {
  console.log('⚠️  serviceAccountKey.json no encontrado, usando .env');
  serviceAccount = {
    type: 'service_account',
    project_id:     process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key:    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email:   process.env.FIREBASE_CLIENT_EMAIL,
    client_id:      process.env.FIREBASE_CLIENT_ID,
    auth_uri:       'https://accounts.google.com/o/oauth2/auth',
    token_uri:      'https://oauth2.googleapis.com/token',
  };
}

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('✅ Firebase Admin inicializado');
}

const db   = admin.firestore();
const auth = admin.auth();

db.settings({ ignoreUndefinedProperties: true });

module.exports = { db, auth, admin };

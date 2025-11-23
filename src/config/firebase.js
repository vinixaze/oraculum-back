const admin = require('firebase-admin');

let db = null;
let isFirebaseEnabled = false;

const initializeFirebase = () => {
  try {
    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_CLIENT_EMAIL && 
        process.env.FIREBASE_PRIVATE_KEY) {
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });

      db = admin.firestore();
      isFirebaseEnabled = true;
      console.log('🔥 Firebase conectado com sucesso!');
    } else {
      console.log('ℹ️  Firebase NÃO configurado - usando PostgreSQL');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error.message);
    console.log('ℹ️  Continuando sem Firebase...');
  }

  return db;
};

const getDb = () => db;

const isFirebaseConnected = () => isFirebaseEnabled;

module.exports = { 
  initializeFirebase, 
  getDb, 
  isFirebaseConnected 
};
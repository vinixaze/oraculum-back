const admin = require('firebase-admin');

let db = null;
let isFirebaseEnabled = false;

const initializeFirebase = () => {
  try {
    // 🔥 OPÇÃO 1: Usar serviceAccountKey.json (quando estiver pronto)
    // Descomente as linhas abaixo e coloque o arquivo na raiz
    /*
    const serviceAccount = require('../../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    */

    // 🔥 OPÇÃO 2: Usar variáveis de ambiente
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
      console.log(' Firebase conectado com sucesso!');
    } else {
      console.log('  Firebase NÃO configurado - usando dados em memória');
      console.log('   Para conectar o Firebase depois:');
      console.log('   1. Adicione serviceAccountKey.json na raiz OU');
      console.log('   2. Configure variáveis no .env');
    }
  } catch (error) {
    console.error(' Erro ao inicializar Firebase:', error.message);
    console.log('  Continuando com dados em memória...');
  }

  return db;
};

const getDb = () => {
  return db;
};

const isFirebaseConnected = () => {
  return isFirebaseEnabled;
};

module.exports = { 
  initializeFirebase, 
  getDb, 
  isFirebaseConnected 
};
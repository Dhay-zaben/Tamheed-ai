const firebaseConfig = {
  apiKey: "AIzaSyBNHdDZKMUQFLzNQ9TmupKXAv8ifaYJ2IM",
  authDomain: "tamheed-f8357.firebaseapp.com",
  projectId: "tamheed-f8357",
  storageBucket: "tamheed-f8357.firebasestorage.app",
  messagingSenderId: "1057681210475",
  appId: "1:1057681210475:web:0df4182530f7df3200452e",
  measurementId: "G-M8DF3L6156"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

window.TAMHEED_FIREBASE = {
  auth,
  db,
  createUserWithEmailAndPassword(authInstance, email, password) {
    return authInstance.createUserWithEmailAndPassword(email, password);
  },
  signInWithEmailAndPassword(authInstance, email, password) {
    return authInstance.signInWithEmailAndPassword(email, password);
  },
  signOut(authInstance) {
    return authInstance.signOut();
  },
  onAuthStateChanged(authInstance, callback) {
    return authInstance.onAuthStateChanged(callback);
  },
  doc(dbInstance, collectionName, id) {
    return dbInstance.collection(collectionName).doc(id);
  },
  setDoc(ref, data, options) {
    if (options && options.merge) {
      return ref.set(data, { merge: true });
    }
    return ref.set(data);
  },
  async getDoc(ref) {
    const snapshot = await ref.get();
    return {
      exists() {
        return snapshot.exists;
      },
      data() {
        return snapshot.data();
      }
    };
  },
  serverTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }
};

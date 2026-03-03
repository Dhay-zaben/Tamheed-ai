const firebaseConfig = {
  apiKey: "AIzaSyBNHdDZKMUQFLzNQ9TmupKXAv8ifaYJ2IM",
  authDomain: "tamheed-f8357.firebaseapp.com",
  projectId: "tamheed-f8357",
  storageBucket: "tamheed-f8357.firebasestorage.app",
  messagingSenderId: "1057681210475",
  appId: "1:1057681210475:web:0df4182530f7df3200452e",
  measurementId: "G-M8DF3L6156"
};

let auth = { currentUser: null };
let db = null;

if (window.firebase) {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.firestore();
}

window.TAMHEED_FIREBASE = {
  auth,
  db,
  createUserWithEmailAndPassword(authInstance, email, password) {
    if (!authInstance || typeof authInstance.createUserWithEmailAndPassword !== "function") {
      return Promise.reject({ code: "auth/unavailable", message: "Firebase auth is unavailable" });
    }
    return authInstance.createUserWithEmailAndPassword(email, password);
  },
  signInWithEmailAndPassword(authInstance, email, password) {
    if (!authInstance || typeof authInstance.signInWithEmailAndPassword !== "function") {
      return Promise.reject({ code: "auth/unavailable", message: "Firebase auth is unavailable" });
    }
    return authInstance.signInWithEmailAndPassword(email, password);
  },
  signOut(authInstance) {
    if (!authInstance || typeof authInstance.signOut !== "function") {
      return Promise.resolve();
    }
    return authInstance.signOut();
  },
  onAuthStateChanged(authInstance, callback) {
    if (!authInstance || typeof authInstance.onAuthStateChanged !== "function") {
      if (typeof callback === "function") {
        callback(null);
      }
      return function () {
        return;
      };
    }
    return authInstance.onAuthStateChanged(callback);
  },
  doc(dbInstance, collectionName, id) {
    if (!dbInstance || typeof dbInstance.collection !== "function") {
      return null;
    }
    return dbInstance.collection(collectionName).doc(id);
  },
  setDoc(ref, data, options) {
    if (!ref || typeof ref.set !== "function") {
      return Promise.resolve();
    }
    if (options && options.merge) {
      return ref.set(data, { merge: true });
    }
    return ref.set(data);
  },
  async getDoc(ref) {
    if (!ref || typeof ref.get !== "function") {
      return {
        exists() {
          return false;
        },
        data() {
          return null;
        }
      };
    }
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
    if (!window.firebase) {
      return new Date().toISOString();
    }
    return firebase.firestore.FieldValue.serverTimestamp();
  }
};

// Firebase Configuration for Cloud Sync
// Replace these values with your Firebase project credentials

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (only if config is provided)
let firebaseInitialized = false;
let firestoreDb = null;

// Check if Firebase is configured
function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" && 
         FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";
}

// Initialize Firebase when Firebase SDK is loaded
function initFirebase() {
  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured. Using local storage only.');
    return false;
  }

  // Check if Firebase is available (loaded via CDN)
  if (typeof firebase === 'undefined') {
    console.log('Firebase SDK not loaded. Add Firebase CDN to HTML.');
    return false;
  }

  try {
    const app = firebase.initializeApp(FIREBASE_CONFIG);
    firestoreDb = firebase.firestore(app);
    firebaseInitialized = true;
    window.firebaseInitialized = true;
    window.syncToFirebase = syncToFirebase;
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

// Sync function to save to Firebase
async function syncToFirebase(collection, docId, data) {
  if (!firebaseInitialized || !firestoreDb) return false;
  
  try {
    await firestoreDb.collection(collection).doc(docId).set({
      ...data,
      lastSynced: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Firebase sync error:', error);
    return false;
  }
}

// Sync function to load from Firebase
async function loadFromFirebase(collection, docId) {
  if (!firebaseInitialized || !firestoreDb) return null;
  
  try {
    const docRef = firestoreDb.collection(collection).doc(docId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Firebase load error:', error);
    return null;
  }
}

// Initialize Firebase when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait a bit for Firebase SDK to load if using CDN
      setTimeout(initFirebase, 100);
    });
  } else {
    setTimeout(initFirebase, 100);
  }
}

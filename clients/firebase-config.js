// Firebase Configuration for Cloud Sync
// EPC Client Management System
// Note: Firebase client config is public by design, but should be restricted via Firestore rules

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBawF_wynu2aM60hrknuESv-hA2g_8W18A",
  authDomain: "epcclients-61ee6.firebaseapp.com",
  projectId: "epcclients-61ee6",
  storageBucket: "epcclients-61ee6.firebasestorage.app",
  messagingSenderId: "290706438619",
  appId: "1:290706438619:web:d8beb28d6a8282fd574ffe",
  measurementId: "G-9FW3SMZ944"
};

// Initialize Firebase (using CDN compat version for compatibility)
let firebaseInitialized = false;
let firestoreDb = null;
let analytics = null;

// Check if Firebase is configured
function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId;
}

// Initialize Firebase when Firebase SDK is loaded
function initFirebase() {
  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured. Using local storage only.');
    return false;
  }

  // Check if Firebase is available (loaded via CDN)
  if (typeof firebase === 'undefined') {
    console.log('Firebase SDK not loaded. Waiting for CDN...');
    // Retry after a short delay (max 10 attempts = 5 seconds)
    if (typeof window.firebaseInitAttempts === 'undefined') {
      window.firebaseInitAttempts = 0;
    }
    window.firebaseInitAttempts++;
    if (window.firebaseInitAttempts < 10) {
      setTimeout(initFirebase, 500);
    } else {
      console.error('Firebase SDK failed to load after multiple attempts');
    }
    return false;
  }

  try {
    // Check if already initialized
    if (firebaseInitialized) {
      console.log('Firebase already initialized');
      return true;
    }
    
    // Initialize Firebase app
    const app = firebase.initializeApp(FIREBASE_CONFIG);
    
    // Initialize Firestore
    firestoreDb = firebase.firestore(app);
    
    // Initialize Analytics (if available)
    try {
      if (typeof firebase.analytics !== 'undefined') {
        analytics = firebase.analytics(app);
        console.log('✅ Firebase Analytics initialized');
      }
    } catch (analyticsError) {
      console.warn('Analytics initialization skipped:', analyticsError.message);
    }
    
    firebaseInitialized = true;
    window.firebaseInitialized = true;
    window.firestoreDb = firestoreDb;
    window.firebaseApp = app;
    window.firebaseAnalytics = analytics;
    window.syncToFirebase = syncToFirebase;
    window.loadFromFirebase = loadFromFirebase;
    
    console.log('✅ Firebase initialized successfully - Cloud sync enabled!');
    console.log('Firestore database ready:', !!firestoreDb);
    console.log('Analytics ready:', !!analytics);
    
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // If app already exists, just get the firestore instance
    try {
      const app = firebase.app();
      firestoreDb = firebase.firestore(app);
      
      // Try to get analytics if available
      try {
        if (typeof firebase.analytics !== 'undefined') {
          analytics = firebase.analytics(app);
        }
      } catch (analyticsError) {
        // Analytics not critical, continue without it
      }
      
      firebaseInitialized = true;
      window.firebaseInitialized = true;
      window.firestoreDb = firestoreDb;
      window.firebaseApp = app;
      window.firebaseAnalytics = analytics;
      window.syncToFirebase = syncToFirebase;
      window.loadFromFirebase = loadFromFirebase;
      console.log('✅ Firebase already initialized, using existing app');
      return true;
    } catch (e) {
      console.error('Failed to get Firebase app:', e);
      return false;
    }
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
    console.log(`Synced ${collection}/${docId} to Firebase`);
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

// Test Firebase connection
async function testFirebaseConnection() {
  if (!firebaseInitialized || !firestoreDb) {
    console.warn('Firebase not initialized yet');
    return { connected: false, error: 'Firebase not initialized' };
  }
  
  try {
    // Try a simple read operation to test connection
    const testRef = firestoreDb.collection('_test').doc('connection');
    await testRef.set({ 
      timestamp: new Date().toISOString(),
      test: true 
    }, { merge: true });
    
    const doc = await testRef.get();
    if (doc.exists()) {
      console.log('✅ Firebase connection test successful');
      return { connected: true, message: 'Firebase is connected and working' };
    } else {
      return { connected: false, error: 'Test document not found' };
    }
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return { connected: false, error: error.message };
  }
}

// Make test function globally available
if (typeof window !== 'undefined') {
  window.testFirebaseConnection = testFirebaseConnection;
}

// Initialize Firebase when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait for Firebase SDK to load from CDN
      setTimeout(async () => {
        const initialized = initFirebase();
        if (initialized) {
          // Test connection after a short delay
          setTimeout(async () => {
            const result = await testFirebaseConnection();
            if (result.connected) {
              console.log('✅ Firebase fully connected and verified');
            } else {
              console.warn('⚠️ Firebase initialized but connection test failed:', result.error);
            }
          }, 1000);
        }
      }, 500);
    });
  } else {
    setTimeout(async () => {
      const initialized = initFirebase();
      if (initialized) {
        setTimeout(async () => {
          const result = await testFirebaseConnection();
          if (result.connected) {
            console.log('✅ Firebase fully connected and verified');
          } else {
            console.warn('⚠️ Firebase initialized but connection test failed:', result.error);
          }
        }, 1000);
      }
    }, 500);
  }
}

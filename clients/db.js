// IndexedDB Database Management for EPC Client System
// Also includes Firebase cloud sync support

const DB_NAME = 'EPC_Client_DB';
const DB_VERSION = 1;

let db = null;
let firebaseEnabled = false;

// Check if Firebase is available and enabled
async function checkFirebase() {
  try {
    // Wait for Firebase to initialize (with timeout)
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max wait
    
    while (attempts < maxAttempts) {
      if (typeof window !== 'undefined' && window.firebaseInitialized && window.firestoreDb) {
        firebaseEnabled = true;
        console.log('Firebase is enabled and ready');
        return true;
      }
      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    firebaseEnabled = false;
    console.log('Firebase not available after waiting');
    return false;
  } catch (e) {
    firebaseEnabled = false;
    console.error('Error checking Firebase:', e);
    return false;
  }
}

// Database initialization
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Clients store
      if (!db.objectStoreNames.contains('clients')) {
        const clientsStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
        clientsStore.createIndex('name', 'name', { unique: false });
        clientsStore.createIndex('category', 'category', { unique: false });
        clientsStore.createIndex('trainer', 'primaryTrainer', { unique: false });
      }

      // Assessments store
      if (!db.objectStoreNames.contains('assessments')) {
        const assessmentsStore = db.createObjectStore('assessments', { keyPath: 'id', autoIncrement: true });
        assessmentsStore.createIndex('clientId', 'clientId', { unique: false });
        assessmentsStore.createIndex('date', 'date', { unique: false });
      }

      // Programs store
      if (!db.objectStoreNames.contains('programs')) {
        const programsStore = db.createObjectStore('programs', { keyPath: 'id', autoIncrement: true });
        programsStore.createIndex('clientId', 'clientId', { unique: false });
        programsStore.createIndex('week', 'week', { unique: false });
        programsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Program photos store
      if (!db.objectStoreNames.contains('programPhotos')) {
        const photosStore = db.createObjectStore('programPhotos', { keyPath: 'id', autoIncrement: true });
        photosStore.createIndex('clientId', 'clientId', { unique: false });
        photosStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }

      // Progress notes store
      if (!db.objectStoreNames.contains('progressNotes')) {
        const notesStore = db.createObjectStore('progressNotes', { keyPath: 'id', autoIncrement: true });
        notesStore.createIndex('clientId', 'clientId', { unique: false });
        notesStore.createIndex('date', 'date', { unique: false });
      }

      // PT notes store
      if (!db.objectStoreNames.contains('ptNotes')) {
        const ptNotesStore = db.createObjectStore('ptNotes', { keyPath: 'id', autoIncrement: true });
        ptNotesStore.createIndex('clientId', 'clientId', { unique: false });
        ptNotesStore.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

// Get database instance
async function getDB() {
  if (db) return db;
  return await initDB();
}

// Helper function to sync to Firebase after IndexedDB operations
async function syncToCloud(collection, docId, data) {
  const firebaseReady = await checkFirebase();
  if (firebaseReady && typeof window !== 'undefined' && window.syncToFirebase) {
    try {
      const success = await window.syncToFirebase(collection, docId, data);
      if (success) {
        console.log(`Successfully synced ${collection}/${docId} to Firebase`);
      } else {
        console.warn(`Failed to sync ${collection}/${docId} to Firebase`);
      }
    } catch (error) {
      console.error('Cloud sync error:', error);
    }
  } else {
    console.log(`Firebase not ready, skipping sync for ${collection}/${docId}`);
  }
}

// ===== CLIENTS =====
async function addClient(clientData) {
  const database = await getDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction(['clients'], 'readwrite');
    const store = transaction.objectStore('clients');
    const clientWithMeta = {
      ...clientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const request = store.add(clientWithMeta);

    request.onsuccess = async () => {
      const clientId = request.result;
      // Sync to cloud if available
      await syncToCloud('clients', `client_${clientId}`, { id: clientId, ...clientWithMeta });
      resolve(clientId);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getAllClients() {
  const database = await getDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction(['clients'], 'readonly');
    const store = transaction.objectStore('clients');
    const request = store.getAll();

    request.onsuccess = async () => {
      let clients = request.result || [];
      
      // Try to load from Firebase/cloud if available
      const firebaseReady = await checkFirebase();
      if (firebaseReady && typeof window !== 'undefined' && window.firestoreDb) {
        try {
          console.log('Attempting to load clients from Firebase...');
          // Load all clients from Firebase
          const firestoreDb = window.firestoreDb;
          const snapshot = await firestoreDb.collection('clients').get();
          const cloudClients = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.id) {
              cloudClients.push(data);
            }
          });
          
          // Merge cloud data with local data (cloud takes precedence)
          if (cloudClients.length > 0) {
            console.log(`Loaded ${cloudClients.length} clients from Firebase`);
            // Update local IndexedDB with cloud data
            const writeTransaction = database.transaction(['clients'], 'readwrite');
            const writeStore = writeTransaction.objectStore('clients');
            
            for (const cloudClient of cloudClients) {
              await new Promise((resolve, reject) => {
                const putRequest = writeStore.put(cloudClient);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
              });
            }
            
            clients = cloudClients;
            console.log('Clients synced from Firebase to local storage');
          } else {
            console.log('No clients found in Firebase, using local data');
          }
        } catch (error) {
          console.error('Error loading from Firebase, using local data:', error);
        }
      } else {
        console.log('Firebase not available, using local IndexedDB only');
      }
      
      resolve(clients);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getClient(clientId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['clients'], 'readonly');
    const store = transaction.objectStore('clients');
    const request = store.get(clientId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateClient(clientId, clientData) {
  const database = await getDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction(['clients'], 'readwrite');
    const store = transaction.objectStore('clients');
    const getRequest = store.get(clientId);

    getRequest.onsuccess = async () => {
      const client = getRequest.result;
      if (!client) {
        reject(new Error('Client not found'));
        return;
      }

      const updated = {
        ...client,
        ...clientData,
        updatedAt: new Date().toISOString()
      };

      const putRequest = store.put(updated);
      putRequest.onsuccess = async () => {
        // Sync to cloud
        await syncToCloud('clients', `client_${clientId}`, updated);
        resolve(putRequest.result);
      };
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function deleteClient(clientId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['clients'], 'readwrite');
    const store = transaction.objectStore('clients');
    const request = store.delete(clientId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ===== ASSESSMENTS =====
async function saveAssessment(clientId, assessmentData) {
  const database = await getDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction(['assessments'], 'readwrite');
    const store = transaction.objectStore('assessments');
    const assessmentWithMeta = {
      clientId: clientId,
      ...assessmentData,
      date: assessmentData.date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    const request = store.add(assessmentWithMeta);

    request.onsuccess = async () => {
      const assessmentId = request.result;
      // Sync to cloud
      await syncToCloud('assessments', `assessment_${assessmentId}`, { id: assessmentId, ...assessmentWithMeta });
      // Update client's last assessment date
      await updateClient(clientId, { lastAssessmentDate: new Date().toISOString() });
      resolve(assessmentId);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getClientAssessments(clientId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['assessments'], 'readonly');
    const store = transaction.objectStore('assessments');
    const index = store.index('clientId');
    const request = index.getAll(clientId);

    request.onsuccess = () => {
      const assessments = request.result.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      resolve(assessments);
    };
    request.onerror = () => reject(request.error);
  });
}

// ===== PROGRAMS =====
async function saveProgram(clientId, programData) {
  const database = await getDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction(['programs'], 'readwrite');
    const store = transaction.objectStore('programs');
    const programWithMeta = {
      clientId: clientId,
      ...programData,
      createdAt: new Date().toISOString()
    };
    const request = store.add(programWithMeta);

    request.onsuccess = async () => {
      const programId = request.result;
      // Sync to cloud
      await syncToCloud('programs', `program_${programId}`, { id: programId, ...programWithMeta });
      // Update client's last program date
      await updateClient(clientId, { lastProgramDate: new Date().toISOString() });
      resolve(programId);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getClientPrograms(clientId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['programs'], 'readonly');
    const store = transaction.objectStore('programs');
    const index = store.index('clientId');
    const request = index.getAll(clientId);

    request.onsuccess = () => {
      const programs = request.result.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      resolve(programs);
    };
    request.onerror = () => reject(request.error);
  });
}

// ===== PROGRAM PHOTOS =====
async function saveProgramPhoto(clientId, photoData) {
  const database = await getDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction(['programPhotos'], 'readwrite');
    const store = transaction.objectStore('programPhotos');
    const photoWithMeta = {
      clientId: clientId,
      ...photoData,
      uploadedAt: new Date().toISOString()
    };
    const request = store.add(photoWithMeta);

    request.onsuccess = async () => {
      const photoId = request.result;
      // Sync to cloud
      await syncToCloud('programPhotos', `photo_${photoId}`, { id: photoId, ...photoWithMeta });
      resolve(photoId);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getClientPhotos(clientId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['programPhotos'], 'readonly');
    const store = transaction.objectStore('programPhotos');
    const index = store.index('clientId');
    const request = index.getAll(clientId);

    request.onsuccess = () => {
      const photos = request.result.sort((a, b) => 
        new Date(b.uploadedAt) - new Date(a.uploadedAt)
      );
      resolve(photos);
    };
    request.onerror = () => reject(request.error);
  });
}

// ===== PROGRESS NOTES =====
async function saveProgressNote(clientId, noteContent) {
  const database = await getDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction(['progressNotes'], 'readwrite');
    const store = transaction.objectStore('progressNotes');
    const noteWithMeta = {
      clientId: clientId,
      content: noteContent,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    const request = store.add(noteWithMeta);

    request.onsuccess = async () => {
      const noteId = request.result;
      // Sync to cloud
      await syncToCloud('progressNotes', `note_${noteId}`, { id: noteId, ...noteWithMeta });
      resolve(noteId);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getClientNotes(clientId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['progressNotes'], 'readonly');
    const store = transaction.objectStore('progressNotes');
    const index = store.index('clientId');
    const request = index.getAll(clientId);

    request.onsuccess = () => {
      const notes = request.result.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      resolve(notes);
    };
    request.onerror = () => reject(request.error);
  });
}

// ===== PT NOTES =====
async function savePTNote(clientId, noteContent) {
  const database = await getDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction(['ptNotes'], 'readwrite');
    const store = transaction.objectStore('ptNotes');
    const noteWithMeta = {
      clientId: clientId,
      content: noteContent,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    const request = store.add(noteWithMeta);

    request.onsuccess = async () => {
      const noteId = request.result;
      // Sync to cloud
      await syncToCloud('ptNotes', `ptnote_${noteId}`, { id: noteId, ...noteWithMeta });
      resolve(noteId);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getClientPTNotes(clientId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['ptNotes'], 'readonly');
    const store = transaction.objectStore('ptNotes');
    const index = store.index('clientId');
    const request = index.getAll(clientId);

    request.onsuccess = () => {
      const notes = request.result.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      resolve(notes);
    };
    request.onerror = () => reject(request.error);
  });
}

// Initialize database on load
if (typeof window !== 'undefined') {
  initDB().catch(console.error);
}

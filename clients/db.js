// IndexedDB Database Management for EPC Client System
// Also includes Firebase cloud sync support

const DB_NAME = 'EPC_Client_DB';
const DB_VERSION = 1;

let db = null;
let firebaseEnabled = false;

// Check if Firebase is available and enabled
async function checkFirebase() {
  try {
    if (typeof window !== 'undefined' && window.firebaseInitialized) {
      firebaseEnabled = true;
    }
  } catch (e) {
    firebaseEnabled = false;
  }
}

// Database initialization with error recovery
async function initDB() {
  return new Promise((resolve, reject) => {
    // Close any existing connection first
    if (db) {
      try {
        db.close();
        db = null;
      } catch (e) {
        console.warn('Error closing existing DB connection:', e);
      }
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB open error:', request.error);
      // Try to recover by deleting and recreating
      console.warn('Attempting database recovery...');
      resetDatabase().then(() => {
        // Retry after reset
        const retryRequest = indexedDB.open(DB_NAME, DB_VERSION);
        retryRequest.onsuccess = () => {
          db = retryRequest.result;
          resolve(db);
        };
        retryRequest.onerror = () => reject(retryRequest.error);
      }).catch(reject);
    };

    request.onsuccess = () => {
      db = request.result;
      
      // Handle database connection errors
      db.onerror = (event) => {
        console.error('Database error:', event.target.error);
      };
      
      db.onclose = () => {
        console.warn('Database connection closed');
        db = null;
      };
      
      // Verify all stores exist
      const requiredStores = ['clients', 'assessments', 'programs', 'programPhotos', 'progressNotes', 'ptNotes'];
      const missingStores = requiredStores.filter(store => !db.objectStoreNames.contains(store));
      
      if (missingStores.length > 0) {
        console.warn('Missing stores detected:', missingStores);
        // Close and reopen with version bump to trigger upgrade
        db.close();
        const upgradeRequest = indexedDB.open(DB_NAME, DB_VERSION + 1);
        upgradeRequest.onupgradeneeded = (event) => {
          createStores(event.target.result);
        };
        upgradeRequest.onsuccess = () => {
          db = upgradeRequest.result;
          resolve(db);
        };
        upgradeRequest.onerror = () => reject(upgradeRequest.error);
      } else {
        resolve(db);
      }
    };

    request.onupgradeneeded = (event) => {
      createStores(event.target.result);
    };
  });
}

// Helper function to create all stores
function createStores(database) {
  // Clients store
  if (!database.objectStoreNames.contains('clients')) {
    const clientsStore = database.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
    clientsStore.createIndex('name', 'name', { unique: false });
    clientsStore.createIndex('category', 'category', { unique: false });
    clientsStore.createIndex('trainer', 'primaryTrainer', { unique: false });
  }

  // Assessments store
  if (!database.objectStoreNames.contains('assessments')) {
    const assessmentsStore = database.createObjectStore('assessments', { keyPath: 'id', autoIncrement: true });
    assessmentsStore.createIndex('clientId', 'clientId', { unique: false });
    assessmentsStore.createIndex('date', 'date', { unique: false });
  }

  // Programs store
  if (!database.objectStoreNames.contains('programs')) {
    const programsStore = database.createObjectStore('programs', { keyPath: 'id', autoIncrement: true });
    programsStore.createIndex('clientId', 'clientId', { unique: false });
    programsStore.createIndex('week', 'week', { unique: false });
    programsStore.createIndex('createdAt', 'createdAt', { unique: false });
  }

  // Program photos store
  if (!database.objectStoreNames.contains('programPhotos')) {
    const photosStore = database.createObjectStore('programPhotos', { keyPath: 'id', autoIncrement: true });
    photosStore.createIndex('clientId', 'clientId', { unique: false });
    photosStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
  }

  // Progress notes store
  if (!database.objectStoreNames.contains('progressNotes')) {
    const notesStore = database.createObjectStore('progressNotes', { keyPath: 'id', autoIncrement: true });
    notesStore.createIndex('clientId', 'clientId', { unique: false });
    notesStore.createIndex('date', 'date', { unique: false });
  }

  // PT notes store
  if (!database.objectStoreNames.contains('ptNotes')) {
    const ptNotesStore = database.createObjectStore('ptNotes', { keyPath: 'id', autoIncrement: true });
    ptNotesStore.createIndex('clientId', 'clientId', { unique: false });
    ptNotesStore.createIndex('date', 'date', { unique: false });
  }
}

// Reset database (delete and recreate) - use with caution!
async function resetDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close();
      db = null;
    }
    
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    
    deleteRequest.onsuccess = () => {
      console.log('Database deleted successfully, will recreate on next init');
      resolve();
    };
    
    deleteRequest.onerror = () => {
      console.error('Error deleting database:', deleteRequest.error);
      reject(deleteRequest.error);
    };
    
    deleteRequest.onblocked = () => {
      console.warn('Database deletion blocked - close all tabs and try again');
      // Still resolve, the next open will handle it
      resolve();
    };
  });
}

// Repair database - checks health and fixes issues
async function repairDatabase() {
  try {
    console.log('Starting database repair...');
    
    // Close existing connection
    if (db) {
      db.close();
      db = null;
    }
    
    // Try to open and verify
    const testDB = await initDB();
    
    // Test read operation
    const testTransaction = testDB.transaction(['clients'], 'readonly');
    const testStore = testTransaction.objectStore('clients');
    await new Promise((resolve, reject) => {
      const testRequest = testStore.getAll();
      testRequest.onsuccess = () => {
        console.log('Database repair successful - found', testRequest.result.length, 'clients');
        resolve();
      };
      testRequest.onerror = () => reject(testRequest.error);
    });
    
    return true;
  } catch (error) {
    console.error('Database repair failed:', error);
    // Last resort: reset database
    console.log('Attempting full database reset...');
    await resetDatabase();
    await initDB();
    return true;
  }
}

// Get database instance
async function getDB() {
  if (db) return db;
  return await initDB();
}

// Helper function to sync to Firebase after IndexedDB operations
async function syncToCloud(collection, docId, data) {
  await checkFirebase();
  if (firebaseEnabled && typeof window !== 'undefined' && window.syncToFirebase) {
    try {
      await window.syncToFirebase(collection, docId, data);
    } catch (error) {
      console.error('Cloud sync error:', error);
    }
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
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['clients'], 'readonly');
    const store = transaction.objectStore('clients');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
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

// Make repair function globally available
if (typeof window !== 'undefined') {
  window.repairDatabase = repairDatabase;
  window.resetDatabase = resetDatabase;
  
  // Initialize database on load with error recovery
  initDB().catch(async (error) => {
    console.error('Database initialization failed:', error);
    console.log('Attempting automatic repair...');
    try {
      await repairDatabase();
      console.log('Database repair completed successfully');
    } catch (repairError) {
      console.error('Automatic repair failed:', repairError);
      alert('Database error detected. Please refresh the page. If the problem persists, open the browser console and run: window.repairDatabase()');
    }
  });
}

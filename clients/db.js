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
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['clients'], 'readwrite');
    const store = transaction.objectStore('clients');
    const getRequest = store.get(clientId);

    getRequest.onsuccess = () => {
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
      putRequest.onsuccess = () => resolve(putRequest.result);
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
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['assessments'], 'readwrite');
    const store = transaction.objectStore('assessments');
    const request = store.add({
      clientId: clientId,
      ...assessmentData,
      date: assessmentData.date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    request.onsuccess = () => {
      // Update client's last assessment date
      updateClient(clientId, { lastAssessmentDate: new Date().toISOString() })
        .then(() => resolve(request.result))
        .catch(reject);
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
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['programs'], 'readwrite');
    const store = transaction.objectStore('programs');
    const request = store.add({
      clientId: clientId,
      ...programData,
      createdAt: new Date().toISOString()
    });

    request.onsuccess = () => {
      // Update client's last program date
      updateClient(clientId, { lastProgramDate: new Date().toISOString() })
        .then(() => resolve(request.result))
        .catch(reject);
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
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['programPhotos'], 'readwrite');
    const store = transaction.objectStore('programPhotos');
    const request = store.add({
      clientId: clientId,
      ...photoData,
      uploadedAt: new Date().toISOString()
    });

    request.onsuccess = () => resolve(request.result);
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
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['progressNotes'], 'readwrite');
    const store = transaction.objectStore('progressNotes');
    const request = store.add({
      clientId: clientId,
      content: noteContent,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    request.onsuccess = () => resolve(request.result);
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
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['ptNotes'], 'readwrite');
    const store = transaction.objectStore('ptNotes');
    const request = store.add({
      clientId: clientId,
      content: noteContent,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    request.onsuccess = () => resolve(request.result);
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

// IndexedDB Database Management for EPC Client System
// Also includes Firebase cloud sync support

const DB_NAME = 'EPC_Client_DB';
const DB_VERSION = 2; // Incremented to force upgrade and recreate stores if needed

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
          console.log('✅ Database recovered and opened successfully');
          resolve(db);
        };
        retryRequest.onerror = () => {
          console.error('Retry after reset failed:', retryRequest.error);
          reject(retryRequest.error);
        };
        retryRequest.onupgradeneeded = (event) => {
          createStores(event.target.result);
        };
      }).catch((resetError) => {
        console.error('Database reset failed:', resetError);
        reject(resetError);
      });
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('✅ Database opened successfully');
      
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
        const upgradeVersion = DB_VERSION + 1;
        console.log(`Upgrading database to version ${upgradeVersion} to create missing stores...`);
        const upgradeRequest = indexedDB.open(DB_NAME, upgradeVersion);
        upgradeRequest.onupgradeneeded = (event) => {
          console.log('Creating missing stores...');
          createStores(event.target.result);
        };
        upgradeRequest.onsuccess = () => {
          db = upgradeRequest.result;
          console.log('✅ Database upgraded successfully');
          resolve(db);
        };
        upgradeRequest.onerror = () => {
          console.error('Database upgrade failed:', upgradeRequest.error);
          reject(upgradeRequest.error);
        };
      } else {
        console.log('✅ All required stores exist');
        resolve(db);
      }
    };

    request.onupgradeneeded = (event) => {
      console.log('Database upgrade needed, creating stores...');
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

// Repair database - checks health and fixes issues (non-blocking)
async function repairDatabase() {
  // Yield to browser at start
  await new Promise(resolve => setTimeout(resolve, 0));
  
  try {
    console.log('🔧 Starting database repair...');
    
    // Close existing connection
    if (db) {
      try {
        db.close();
      } catch (e) {
        console.warn('Error closing DB:', e);
      }
      db = null;
    }
    
    // Yield before heavy operation
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Try to open and verify
    console.log('Initializing database...');
    const testDB = await initDB();
    
    if (!testDB) {
      throw new Error('Database initialization returned null');
    }
    
    // Yield again
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify stores exist
    const requiredStores = ['clients', 'assessments', 'programs', 'programPhotos', 'progressNotes', 'ptNotes'];
    const missingStores = requiredStores.filter(store => !testDB.objectStoreNames.contains(store));
    
    if (missingStores.length > 0) {
      console.warn('Missing stores detected:', missingStores);
      // Force upgrade by incrementing version
      testDB.close();
      const DB_VERSION_NEW = DB_VERSION + 1;
      console.log(`Upgrading database to version ${DB_VERSION_NEW}...`);
      
      // Yield before upgrade
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const upgradeRequest = indexedDB.open(DB_NAME, DB_VERSION_NEW);
      await new Promise((resolve, reject) => {
        upgradeRequest.onupgradeneeded = (event) => {
          console.log('Creating missing stores during upgrade...');
          createStores(event.target.result);
        };
        upgradeRequest.onsuccess = () => {
          db = upgradeRequest.result;
          console.log('✅ Database upgraded successfully');
          resolve();
        };
        upgradeRequest.onerror = () => reject(upgradeRequest.error);
      });
    }
    
    // Yield before read test
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Test read operation
    console.log('Testing database read operation...');
    const testTransaction = db.transaction(['clients'], 'readonly');
    const testStore = testTransaction.objectStore('clients');
    await new Promise((resolve, reject) => {
      const testRequest = testStore.getAll();
      testRequest.onsuccess = () => {
        const clients = testRequest.result || [];
        console.log(`✅ Database repair successful - found ${clients.length} clients`);
        resolve();
      };
      testRequest.onerror = () => {
        console.error('Read test failed:', testRequest.error);
        reject(testRequest.error);
      };
    });
    
    console.log('✅ Database repair completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database repair failed:', error);
    // Don't use confirm() here - let the caller handle user interaction
    // This prevents blocking the UI thread
    throw error;
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
  try {
    const database = await getDB();
    if (!database) {
      throw new Error('Database not initialized');
    }
    
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = database.transaction(['clients'], 'readwrite');
        if (!transaction) {
          reject(new Error('Failed to create transaction'));
          return;
        }
        
        const store = transaction.objectStore('clients');
        if (!store) {
          reject(new Error('Clients store not found. Please click "Repair DB" button.'));
          return;
        }
        
        const clientWithMeta = {
          ...clientData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('Adding client to database:', clientWithMeta);
        const request = store.add(clientWithMeta);

        request.onsuccess = async () => {
          const clientId = request.result;
          console.log('✅ Client added to IndexedDB with ID:', clientId);
          // Sync to cloud if available
          try {
            await syncToCloud('clients', `client_${clientId}`, { id: clientId, ...clientWithMeta });
          } catch (syncError) {
            console.warn('Cloud sync failed (non-critical):', syncError);
          }
          resolve(clientId);
        };
        
        request.onerror = () => {
          console.error('Error adding client:', request.error);
          reject(request.error || new Error('Failed to add client to database'));
        };
        
        transaction.onerror = () => {
          console.error('Transaction error:', transaction.error);
          reject(transaction.error || new Error('Transaction failed'));
        };
      } catch (error) {
        console.error('Error in addClient:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('Error getting database in addClient:', error);
    throw error;
  }
}

async function getAllClients() {
  try {
    const database = await getDB();
    if (!database) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = database.transaction(['clients'], 'readonly');
        if (!transaction) {
          reject(new Error('Failed to create transaction'));
          return;
        }
        
        const store = transaction.objectStore('clients');
        if (!store) {
          reject(new Error('Clients store not found. Database may need repair.'));
          return;
        }
        
        const request = store.getAll();

        request.onsuccess = () => {
          const clients = request.result || [];
          console.log(`✅ Retrieved ${clients.length} clients from database`);
          resolve(clients);
        };
        
        request.onerror = () => {
          console.error('Error in getAllClients request:', request.error);
          reject(request.error || new Error('Failed to retrieve clients'));
        };
      } catch (error) {
        console.error('Error in getAllClients:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('Error getting database in getAllClients:', error);
    throw error;
  }
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

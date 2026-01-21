# Firebase Cloud Sync Setup

To enable cross-device data synchronization, you need to set up Firebase Firestore.

## Steps to Enable Cloud Sync:

1. **Create a Firebase Project:**
   - Go to https://console.firebase.google.com/
   - Click "Add project"
   - Follow the setup wizard

2. **Enable Firestore Database:**
   - In your Firebase project, go to "Firestore Database"
   - Click "Create database"
   - Start in "Test mode" (or set up proper security rules)
   - Choose a location

3. **Get Your Firebase Config:**
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps"
   - Click the web icon (`</>`)
   - Register your app
   - Copy the `firebaseConfig` object

4. **Update `firebase-config.js`:**
   - Open `clients/firebase-config.js`
   - Replace the placeholder values with your actual Firebase config:
     ```javascript
     const FIREBASE_CONFIG = {
       apiKey: "your-actual-api-key",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "your-sender-id",
       appId: "your-app-id"
     };
     ```

5. **Enable Firebase SDK in HTML:**
   - Open `clients/client.html` and `clients/dashboard.html`
   - Uncomment the Firebase SDK script tags (remove `<!-- -->` around them):
     ```html
     <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"></script>
     <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"></script>
     ```

5. **Set Firestore Security Rules (Optional but Recommended):**
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow read/write access to all documents (for internal use)
       // In production, add proper authentication
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

## How It Works:

- **Local First:** All data is stored locally in IndexedDB for offline access
- **Cloud Sync:** When Firebase is configured, data automatically syncs to Firestore
- **Cross-Device:** Data saved on one device will be available on all devices
- **Fallback:** If Firebase is not configured, the system works entirely offline with local storage

## Data Structure:

Data is synced with the following collections:
- `clients` - Client profiles
- `assessments` - Assessment data
- `programs` - Training programs
- `programPhotos` - Program photos
- `progressNotes` - Progress notes
- `ptNotes` - PT coordination notes

Each document is keyed with the client ID or assessment ID for easy retrieval.

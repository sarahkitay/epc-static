# Firestore Security Rules for EPC Client Management

## Recommended Rules (Password Protected Internal System)

Since the client management system is password-protected and internal use only, you can use these rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    // This is safe because the system is password-protected (15125)
    // and only accessible to EPC staff
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Alternative: More Restrictive Rules (Optional)

If you want to add an extra layer of security, you can restrict by collection:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Clients collection
    match /clients/{clientId} {
      allow read, write: if true;
    }
    
    // Assessments collection
    match /assessments/{assessmentId} {
      allow read, write: if true;
    }
    
    // Programs collection
    match /programs/{programId} {
      allow read, write: if true;
    }
    
    // Program photos collection
    match /programPhotos/{photoId} {
      allow read, write: if true;
    }
    
    // Progress notes collection
    match /progressNotes/{noteId} {
      allow read, write: if true;
    }
    
    // PT notes collection
    match /ptNotes/{noteId} {
      allow read, write: if true;
    }
  }
}
```

## Important Notes

- **Current rules (`allow read, write: if false`) will block all access** - you need to change this to `if true` for the system to work
- The system is already password-protected (password: 15125)
- This is an internal tool, not public-facing
- Location: Los Angeles (us-west2) is fine for your clinic location

## How to Update Rules

1. Go to Firebase Console → Firestore Database → Rules
2. Replace the rules with one of the options above
3. Click "Publish"
4. Rules take effect immediately

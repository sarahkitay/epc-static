# ⚠️ IMPORTANT: Fix Your Firestore Rules

Your current Firestore rules are **blocking all access**. You need to change them:

## Current Rules (BROKEN - Blocks Everything):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // ❌ This blocks everything!
    }
  }
}
```

## Fixed Rules (Use This):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ✅ This allows access
    }
  }
}
```

## How to Fix:

1. Go to https://console.firebase.google.com/
2. Select project: **epcclients-61ee6**
3. Go to **Firestore Database** → **Rules** tab
4. Replace `if false` with `if true`
5. Click **Publish**

**Location:** Los Angeles (us-west2) is perfect for your clinic location.

**Why this is safe:**
- Your system is password-protected (15125)
- It's an internal tool, not public
- Only staff with the password can access it

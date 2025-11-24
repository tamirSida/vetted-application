# Firebase Storage Rules IAM Permission Fix

## Issue
Firebase Storage rules that access Firestore data (like checking user roles) require additional IAM permissions.

## Solution Options

### Option 1: Use Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click **Service Accounts** tab
5. Find the **Firebase Adminsdk** service account email
6. Copy the email (looks like: `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`)
7. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam)
8. Click **Grant Access**
9. Paste the service account email
10. Add role: **Cloud Datastore User**
11. Click **Save**

### Option 2: Use gcloud CLI
```bash
# Get your project ID
PROJECT_ID="your-project-id"

# Get the Firebase service account email
gcloud iam service-accounts list --filter="displayName:firebase-adminsdk"

# Grant the role (replace with actual service account email)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Option 3: Simplified Storage Rules (Alternative)
If you prefer not to modify IAM, here's a simplified version that doesn't access Firestore:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Simplified rules without Firestore access
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // User files - users can only access their own
    match /users/{userId}/{allPaths=**} {
      allow read, write, delete: if isOwner(userId);
    }
    
    match /applications/{userId}/{phase}/{allPaths=**} {
      allow read, write, delete: if isOwner(userId);
    }
    
    match /resumes/{userId}/{allPaths=**} {
      allow read, write, delete: if isOwner(userId);
    }
    
    match /portfolios/{userId}/{allPaths=**} {
      allow read, write, delete: if isOwner(userId);
    }
    
    match /profile-images/{userId}/{allPaths=**} {
      allow read, write, delete: if isOwner(userId);
    }
    
    match /temp/{userId}/{allPaths=**} {
      allow read, write, delete: if isOwner(userId);
    }
    
    // Default deny for everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Recommended Approach

**Use Option 1** (Firebase Console) as it's the most straightforward and doesn't require CLI access. This enables admin and viewer access to files while maintaining security.

If you encounter issues with IAM permissions in your environment, **Option 3** provides a secure fallback that still protects user data isolation.

## After Applying Fix

Deploy your storage rules:
```bash
firebase deploy --only storage
```

## Verification

Test that the rules work by:
1. Having an admin/viewer try to access files
2. Having a user access their own files
3. Having a user try to access another user's files (should fail)
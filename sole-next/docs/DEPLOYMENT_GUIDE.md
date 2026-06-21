# SOLE - Deployment Guide

This guide covers deploying the SOLE Next.js application to Vercel and applying the correct Firestore security rules.

## 1. Push to GitHub
1. Open your terminal in the `sole-next` directory.
2. Initialize a git repository and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Next.js migration complete"
   ```
3. Create a new repository on GitHub.
4. Add the remote and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/yourusername/sole-next.git
   git push -u origin main
   ```

## 2. Deploy to Vercel
1. Go to [Vercel](https://vercel.com/) and log in with your GitHub account.
2. Click **Add New** > **Project**.
3. Import the `sole-next` repository you just created.
4. **Environment Variables**: Open the Environment Variables section before clicking Deploy. 
   Copy the keys and values from your local `.env.local` file. 

   > [!WARNING]
   > **CRITICAL: Firebase Admin Private Key**
   > When pasting `FIREBASE_ADMIN_PRIVATE_KEY` into the Vercel UI, **do NOT include surrounding quotes**. The Next.js API route handles the newline replacement `replace(/\\n/g, '\n')`, so just paste the raw string from your `.env.local` exactly as it appears.

5. Click **Deploy**. Vercel will build and launch your application.

## 3. Lighthouse Performance Testing
1. Once deployed, open the Vercel production URL in Google Chrome.
2. Open Chrome DevTools (`F12` or `Cmd+Option+I`).
3. Navigate to the **Lighthouse** tab.
4. Select "Mobile" and check "Performance", "Accessibility", "Best Practices", and "SEO".
5. Click **Analyze page load**. You should see scores of 90+ across the board.

## 4. Firestore Security Rules
To secure your database, go to the Firebase Console -> Firestore Database -> Rules. Paste and publish the following rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products: Publicly readable, admin only writes
    match /products/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Orders: Anyone can create (checkout), only admin can read/update/delete
    match /orders/{doc} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // System Settings: Publicly readable, admin only writes
    match /system_settings/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

# Google Sheets Integration Solution

## The Problem

The Firebase extension `djawadi/http-export-sheets` is using Node.js 16, which has been decommissioned. When trying to deploy it, you're receiving the error:

```
Runtime: nodejs16 is decommissioned and no longer allowed. Please use the latest Node.js runtime for Cloud Functions.
```

## Solution Steps

This document outlines a custom implementation that replaces the Firebase extension with a Node.js 18 compatible solution.

### 1. Custom Implementation

We've created a custom Firebase Function that triggers on new documents in the `formSubmissions` Firestore collection and saves that data to Google Sheets. The implementation uses:

- Node.js 18 (as specified in your `package.json`)
- Google Sheets API via the `googleapis` package
- Firestore triggers instead of HTTP endpoints

### 2. Required Files

- **`google-sheets-export.js`**: Contains the Cloud Function that integrates with Google Sheets
- **`src/helpers/formSubmission.js`**: Client-side helper to send form data to Firestore

### 3. Deployment Instructions

To complete the deployment of this solution:

1. Fix Google Cloud Storage permissions issue:
   - Go to Google Cloud Console: https://console.cloud.google.com/
   - Navigate to IAM & Admin > IAM
   - Find the service account `431730670558-compute@developer.gserviceaccount.com`
   - Grant it the `Storage Object Viewer` role
   - If using VPC Service Controls, also grant it access to your service perimeter

2. Set up Google Sheets API credentials:
   - Enable the Google Sheets API in your Google Cloud Console
   - Create a service account with appropriate permissions
   - Share your Google Sheet with the service account email

3. Configure Firebase:
   ```bash
   firebase functions:config:set googlesheets.spreadsheet_id="YOUR_SPREADSHEET_ID" googlesheets.sheet_name="Sheet1" googlesheets.allowed_columns="*"
   ```

4. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

### 4. Usage Instructions

1. Import the helper function in your form component:
   ```javascript
   import { submitFormToGoogleSheets } from '../helpers/formSubmission';
   ```

2. Use the helper function to submit form data:
   ```javascript
   const handleSubmit = async (event) => {
     event.preventDefault();
     
     const formData = {
       name: nameInput,
       email: emailInput,
       message: messageInput,
       // ... other form fields
     };
     
     const result = await submitFormToGoogleSheets(formData);
     
     if (result.success) {
       // Show success message
     } else {
       // Show error message
     }
   };
   ```

### 5. Troubleshooting

If you continue to experience deployment issues, try:

1. Upgrading the Firebase Functions SDK:
   ```bash
   cd functions
   npm install --save firebase-functions@latest
   ```

2. Upgrading to Node.js 20:
   - Edit the `engines` field in `functions/package.json` to use Node.js 20
   - Deploy again

3. Check Cloud Functions logs in Firebase Console for detailed error messages

### Note on Firebase Extensions

The Firebase extension you were trying to use (`djawadi/http-export-sheets`) is no longer maintained with up-to-date Node.js runtimes. This custom solution provides the same functionality while using modern, supported Node.js versions.
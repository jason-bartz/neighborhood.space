// Google Sheets Direct Integration
// This uses Google Sheets API directly from the client

const SPREADSHEET_ID = '1D7t661RQ3J0vC8N0g3gQfEcxxmEMa8Bq0KJcjvYceuw';
const SHEET_NAME = 'Sheet1';

// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbySnt9vFDgDI8XatKXpZwqNPHYfYNkCcl40pZCYElEOPjHLM2kKdbI_UfaIU3bFbT/exec';

export const submitToGoogleSheets = async (pitchData) => {
  try {
    const timestamp = new Date().toLocaleString();
    
    // Prepare the data
    const formData = {
      timestamp,
      chapter: pitchData.chapter || '',
      founderName: pitchData.founderName || '',
      businessName: pitchData.businessName || '',
      email: pitchData.email || '',
      phone: '', // Phone field not collected in form
      website: pitchData.website || '',
      bio: pitchData.bio || '',
      valueProp: pitchData.valueProp || '',
      problem: pitchData.problem || '',
      solution: pitchData.solution || '',
      businessModel: pitchData.businessModel || '',
      hasPayingCustomers: pitchData.hasPayingCustomers || '',
      grantUsePlan: pitchData.grantUsePlan || '',
      heardAbout: pitchData.heardAbout || '',
      videoUrl: pitchData.pitchVideoUrl || pitchData.pitchVideoFile || '',
      pitchId: pitchData.id || ''
    };
    
    // Debug logging
    console.log('Sending to Google Sheets:', formData);
    console.log('URL:', GOOGLE_SCRIPT_URL);
    
    // Send to Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script doesn't support CORS
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    console.log('Submitted to Google Sheets - Response:', response);
    return { success: true };
    
  } catch (error) {
    console.error('Error submitting to Google Sheets:', error);
    return { success: false, error: error.message };
  }
};
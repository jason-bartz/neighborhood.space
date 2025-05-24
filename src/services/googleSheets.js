// Google Sheets Direct Integration
// This uses Google Sheets API directly from the client

const SPREADSHEET_ID = '1D7t661RQ3J0vC8N0g3gQfEcxxmEMa8Bq0KJcjvYceuw';
const SHEET_NAME = 'Sheet1';

// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/a/macros/goodneighbor.fund/s/AKfycbxKt9ofrgaTCcoB23h-XlqkCgtUwdL3cfcDMyRGCXsnMIpw_0y1ag8-af2ggJVXUy7N/exec';

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
      phone: pitchData.phone || '',
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
    
    // Send to Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script doesn't support CORS
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    console.log('Submitted to Google Sheets');
    return { success: true };
    
  } catch (error) {
    console.error('Error submitting to Google Sheets:', error);
    return { success: false, error: error.message };
  }
};
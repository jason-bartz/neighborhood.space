// Google Apps Script Code
// 1. Go to Google Sheets
// 2. Click Extensions > Apps Script
// 3. Replace the code with this
// 4. Click Deploy > New Deployment
// 5. Choose "Web app" as the type
// 6. Set "Execute as" to your account
// 7. Set "Who has access" to "Anyone"
// 8. Copy the Web App URL and use it in your React app

function doPost(e) {
  try {
    // Your spreadsheet ID
    const SPREADSHEET_ID = '1D7t661RQ3J0vC8N0g3gQfEcxxmEMa8Bq0KJcjvYceuw';
    const SHEET_NAME = 'Sheet1';
    
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Open the spreadsheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // Prepare the row
    const row = [
      data.timestamp,
      data.chapter,
      data.founderName,
      data.businessName,
      data.email,
      data.phone,
      data.website,
      data.bio,
      data.valueProp,
      data.problem,
      data.solution,
      data.businessModel,
      data.hasPayingCustomers,
      data.grantUsePlan,
      data.heardAbout,
      data.videoUrl,
      data.pitchId
    ];
    
    // Append the row
    sheet.appendRow(row);
    
    // Return success
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data added successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function doGet() {
  return ContentService.createTextOutput('Google Apps Script is working!');
}
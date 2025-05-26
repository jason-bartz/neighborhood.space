const functions = require('firebase-functions');
const { google } = require('googleapis');

// This is a replacement for the Firebase extension djawadi/http-export-sheets
// but implemented with Node.js 18 instead of Node.js 16

// Function triggered by Firestore document creation
exports.saveFormToSheets = functions.firestore
  .document('formSubmissions/{formId}')
  .onCreate(async (snapshot, context) => {
  try {
    // Get parameters from environment variables (set these in Firebase config)
    const config = functions.config().googlesheets || {};
    const spreadsheetId = config.spreadsheet_id;
    const sheetName = config.sheet_name;
    const allowedColumns = config.allowed_columns ? config.allowed_columns.split(',') : ['*'];
    
    if (!spreadsheetId || !sheetName) {
      console.error('Missing configuration: spreadsheet_id or sheet_name');
      return;
    }

    // Get data from the Firestore document
    const data = snapshot.data();
    if (!data) {
      console.error('No data in document');
      return;
    }
    
    console.log('Received data from Firestore:', data);
    
    // Filter columns if needed
    let filteredData = data;
    if (allowedColumns[0] !== '*') {
      filteredData = {};
      allowedColumns.forEach(column => {
        if (data[column] !== undefined) {
          filteredData[column] = data[column];
        }
      });
    }
    
    console.log('Filtered data:', filteredData);
    
    // Initialize auth client using service account
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    // First, get the headers from the first row
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    
    let headers = headerResponse.data.values && headerResponse.data.values[0] 
      ? headerResponse.data.values[0] 
      : Object.keys(filteredData);
    
    console.log('Headers:', headers);
    
    // If sheet is empty, add headers first
    if (!headerResponse.data.values || !headerResponse.data.values[0]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });
    }
    
    // Prepare row data in the same order as headers
    const rowData = headers.map(header => filteredData[header] || '');
    
    // Append the data to the sheet
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    });
    
    console.log('Append response:', appendResponse.data);
    
    console.log('Data saved to Google Sheets successfully');
    return {
      result: 'success',
      message: 'Data saved to Google Sheets',
      data: filteredData
    };
    
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    return {
      result: 'error',
      message: 'Error saving data to Google Sheets',
      error: error.message
    };
  }
});
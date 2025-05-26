import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Adjust path as needed

/**
 * Submit form data to Firestore, which will trigger the Cloud Function to save to Google Sheets
 * 
 * @param {Object} formData - The form data to submit
 * @returns {Promise<Object>} - Result of the submission operation
 */
export const submitFormToGoogleSheets = async (formData) => {
  try {
    // Add timestamp
    const dataWithTimestamp = {
      ...formData,
      submittedAt: new Date(),
    };
    
    // Save to Firestore 'formSubmissions' collection
    const docRef = await addDoc(collection(db, 'formSubmissions'), dataWithTimestamp);
    
    console.log('Form submitted with ID:', docRef.id);
    return {
      success: true,
      message: 'Form submitted successfully',
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error submitting form:', error);
    return {
      success: false,
      message: 'Error submitting form',
      error: error.message,
    };
  }
};
const functions = require("firebase-functions");

// Test function - simplest possible
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});
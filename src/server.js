// server.js api.video video management
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

// API key from api.video
const API_KEY = '9UoBYurZoFCaJEzr0aRSM40vajjcpKyvNS285437xjX';

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Endpoint to get upload token
app.get('/api/get-upload-token', async (req, res) => {
  try {
    console.log('Getting upload token...');
    
    // Step 1: Create a video container
    const videoResponse = await axios.post(
      'https://sandbox.api.video/videos',
      {
        title: `Pitch Video - ${new Date().toISOString()}`,
        public: true
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const videoId = videoResponse.data.videoId;
    console.log('Video container created with ID:', videoId);
    
    // Step 2: Get upload token for this video
    const tokenResponse = await axios.post(
      'https://sandbox.api.video/upload-tokens',
      {
        ttl: 3600, // Token valid for 1 hour
        metadata: { videoId }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const token = tokenResponse.data.token;
    console.log('Upload token created:', token);
    
    // Return both token and video ID to the client
    res.json({ token, videoId });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get upload token', 
      details: error.response?.data || error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// VideoUploader.jsx - Fixed for delegated uploads
import React, { useState, useEffect } from "react";
import axios from "axios";

// Yolo
const API_KEY = 'yfUUdHKF9HYorVvjWJMu7mkav3NWxKvrUnDUZ6rCul1';
const API_BASE_URL = 'https://ws.api.video'; // Yolo

const VideoUploader = ({ onVideoUploaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [token, setToken] = useState(null);

  // First, authenticate with api.video to get an access token
  const authenticate = async () => {
    try {
      console.log('Authenticating with api.video...');
      
      const authResponse = await axios.post(
        `${API_BASE_URL}/auth/api-key`,
        { apiKey: API_KEY },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return authResponse.data.access_token;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate with api.video');
    }
  };

  // Then, create a delegated upload token
  const createUploadToken = async (accessToken) => {
    try {
      console.log('Creating delegated upload token...');
      
      const tokenResponse = await axios.post(
        `${API_BASE_URL}/upload-tokens`,
        {
          ttl: 3600 // Token valid for 1 hour
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Token created successfully:', tokenResponse.data);
      return tokenResponse.data.token;
    } catch (error) {
      console.error('Token creation error:', error);
      throw new Error('Failed to create upload token');
    }
  };

  // Initialize the uploader by authenticating and creating a token
  const initializeUploader = async () => {
    setIsLoading(true);
    setUploadError(null);
    
    try {
      // First authenticate to get an access token
      const accessToken = await authenticate();
      console.log('Authentication successful');
      
      // Then create an upload token using the access token
      const uploadToken = await createUploadToken(accessToken);
      console.log('Upload token created:', uploadToken);
      
      setToken(uploadToken);
      return uploadToken;
    } catch (error) {
      console.error('Initialization error:', error);
      setUploadError(error.message || 'Failed to initialize uploader');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize the uploader when the component mounts
  useEffect(() => {
    initializeUploader();
  }, []);

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type and size
    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a valid video file.');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB
      setUploadError('Video file too large (max 50MB)');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    // If we don't have a token yet, try to get one
    let uploadToken = token;
    if (!uploadToken) {
      uploadToken = await initializeUploader();
      if (!uploadToken) {
        setIsUploading(false);
        return;
      }
    }
    
    try {
      // Create form data with the file
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Starting upload with token:', uploadToken);
      
      // Upload to api.video using the delegated token
      const uploadResponse = await axios.post(
        `${API_BASE_URL}/upload?token=${uploadToken}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress: ${percentCompleted}%`);
            setUploadProgress(percentCompleted);
          }
        }
      );
      
      console.log('Upload complete:', uploadResponse.data);
      
      // Extract video ID from the response
      const uploadedVideoId = uploadResponse.data.videoId;
      setVideoId(uploadedVideoId);
      
      // Get player URL
      const playerUrl = `https://embed.api.video/vod/${uploadedVideoId}`;
      console.log('Player URL:', playerUrl);
      
      // Notify parent component
      onVideoUploaded(playerUrl);
      
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload failed:', error.response?.data || error.message);
      setUploadError(`Upload failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetry = async () => {
    setUploadError(null);
    setUploadProgress(0);
    await initializeUploader();
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontWeight: "bold", marginBottom: '4px' }}>
        Upload a 60-second pitch video *
      </label>
      <small style={{ display: "block", color: "#666", marginBottom: "4px" }}>
        Pitch Video is required to be considered for a micro-grant. Max 50MB. MP4, WebM, MOV recommended.
      </small>
      
      {/* File input */}
      <input 
        type="file" 
        accept="video/*"
        onChange={handleFileSelect}
        disabled={isUploading || isLoading}
        style={{ 
          width: "100%", 
          padding: "8px", 
          boxSizing: 'border-box', 
          border: '1px solid #ccc', 
          borderRadius: '0px',
          cursor: (isUploading || isLoading) ? 'not-allowed' : 'pointer'
        }}
      />
      
      {/* Loading state */}
      {isLoading && !uploadError && (
        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          Initializing uploader...
        </div>
      )}
      
      {/* Progress bar */}
      {isUploading && (
        <div style={{ marginTop: "8px" }}>
          <div style={{ height: "10px", width: "100%", backgroundColor: "#f0f0f0", borderRadius: "5px" }}>
            <div 
              style={{ 
                height: "100%", 
                width: `${uploadProgress}%`, 
                backgroundColor: "#ec71b8", 
                borderRadius: "5px", 
                transition: "width 0.3s ease" 
              }} 
            />
          </div>
          <small style={{ color: "#666" }}>
            {uploadProgress}% uploaded
          </small>
        </div>
      )}
      
      {/* Error message with retry button */}
      {uploadError && (
        <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#fff0f0", borderRadius: "4px" }}>
          <div style={{ color: "red", fontSize: "13px", marginBottom: "6px" }}>
            Error: {uploadError}
          </div>
          <button 
            onClick={handleRetry}
            style={{
              background: "#ffeaf5",
              border: "1px solid #d48fc7",
              padding: "4px 8px",
              cursor: "pointer",
              borderRadius: "4px",
              fontSize: '12px'
            }}
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Success message */}
      {uploadProgress === 100 && !isUploading && !uploadError && (
        <div style={{ 
          marginTop: "8px", 
          padding: "8px", 
          backgroundColor: "#f0fff0", 
          borderRadius: "4px",
          color: "green", 
          fontSize: "13px" 
        }}>
          Video uploaded successfully! It will be submitted with your application.
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
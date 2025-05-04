import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import './App.css';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [expressions, setExpressions] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({
    width: 640,
    height: 480
  });

  // Load models from public folder
  const loadModels = async () => {
    const MODEL_URL = process.env.PUBLIC_URL + '/models';
    
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  // Handle video on play to get proper dimensions
  const handleVideoOnPlay = () => {
    if (webcamRef.current) {
      const video = webcamRef.current.video;
      setVideoDimensions({
        width: video.videoWidth,
        height: video.videoHeight
      });
    }
  };

  // Detect faces and expressions
  const detectFaces = async () => {
    if (!modelsLoaded || !webcamRef.current || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    
    // Match canvas dimensions exactly to video
    canvas.width = videoDimensions.width;
    canvas.height = videoDimensions.height;
    
    // Get display size (how the video is actually rendered on screen)
    const displaySize = {
      width: video.offsetWidth,
      height: video.offsetHeight
    };
    
    // Detect faces with expressions
    const detections = await faceapi.detectAllFaces(
      video, 
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceExpressions();
    
    // Clear canvas
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Resize detections to match display size
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    // Draw detections
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    
    // Update expressions state if a face is detected
    if (detections.length > 0) {
      setExpressions(detections[0].expressions);
    }
  };

  // Load models when component mounts
  useEffect(() => {
    loadModels();
  }, []);

  // Run detection at intervals
  useEffect(() => {
    if (!modelsLoaded) return;
    
    const interval = setInterval(() => {
      detectFaces();
    }, 100); // Run detection every 100ms for smoother tracking
    
    return () => clearInterval(interval);
  }, [modelsLoaded, videoDimensions]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Face Expression Detector</h1>
        <div style={{ 
          position: 'relative',
          // In your container div style:
          maxWidth: '100%',
          height: 'auto',
          width: '640px',
          height: '480px',
          margin: '0 auto', // This centers the container
          border: '2px solid #61dafb', // Optional: visual boundary
          borderRadius: '8px', // Optional: rounded corners
          overflow: 'hidden' ,// Ensures content stays within bounds
          aspectRatio: '4/3' // Maintains 4:3 aspect ratio
        }}>
          <Webcam
            ref={webcamRef}
            onPlay={handleVideoOnPlay}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block' // Removes any default inline spacing
            }}
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: 'user'
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none' // Allows clicking through canvas
            }}
          />
        </div>
        
        {expressions && (
          <div className="expressions">
            <h2>Your Current Expression:</h2>
            <p>😊 Happy: {(expressions.happy * 100).toFixed(2)}%</p>
            <p>😐 Neutral: {(expressions.neutral * 100).toFixed(2)}%</p>
            <p>😞 Sad: {(expressions.sad * 100).toFixed(2)}%</p>
            <p>😠 Angry: {(expressions.angry * 100).toFixed(2)}%</p>
            <p>😲 Surprised: {(expressions.surprised * 100).toFixed(2)}%</p>
            <p>😨 Fearful: {(expressions.fearful * 100).toFixed(2)}%</p>
            <p>🤢 Disgusted: {(expressions.disgusted * 100).toFixed(2)}%</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
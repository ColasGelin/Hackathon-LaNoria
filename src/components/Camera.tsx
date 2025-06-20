'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera as CameraIcon } from 'lucide-react';

// Add type declaration for window.tapTimeout
declare global {
  interface Window {
    tapTimeout?: NodeJS.Timeout;
  }
}

interface CameraProps {
  onCapture?: (imageData: string) => void;
  onClose?: () => void;
}

export default function Camera({}: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aiAnalysisRef = useRef<NodeJS.Timeout | null>(null);
  const photoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode] = useState<'user' | 'environment'>('environment');
  const [aiDescription, setAiDescription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoCount, setPhotoCount] = useState<number>(0);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  }, [facingMode]);

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Create download link
        const url = imageData;
        const a = document.createElement('a');
        a.href = url;
        a.download = `photo-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setPhotoCount(prev => prev + 1);
        return imageData;
      }
    }
    return null;
  }, []);

  const captureFrameForAI = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    }
    return null;
  }, []);

  const analyzeFrame = useCallback(async (imageData: string) => {
    try {
      setIsAnalyzing(true);
      
      const response = await fetch('/api/analyze-frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiDescription(data.description);
      } else {
        console.error('Failed to analyze frame:', response.statusText);
      }
    } catch (error) {
      console.error('Error analyzing frame:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const startAIAnalysis = useCallback(() => {
    if (aiAnalysisRef.current) {
      clearInterval(aiAnalysisRef.current);
    }

    // Analyze frame every 2 seconds
    aiAnalysisRef.current = setInterval(() => {
      const frameData = captureFrameForAI();
      if (frameData) {
        analyzeFrame(frameData);
      }
    }, 2000);
  }, [captureFrameForAI, analyzeFrame]);

  const stopAIAnalysis = useCallback(() => {
    if (aiAnalysisRef.current) {
      clearInterval(aiAnalysisRef.current);
      aiAnalysisRef.current = null;
    }
    setAiDescription('');
    setIsAnalyzing(false);
  }, []);

  const startPhotoCapture = useCallback(() => {
    if (!isCapturing) {
      setIsCapturing(true);
      setPhotoCount(0);
      
      // Take first photo immediately
      capturePhoto();
      
      // Then take photos every 5 seconds
      photoIntervalRef.current = setInterval(() => {
        capturePhoto();
        console.log('Photo captured');
      }, 5000);
      
      // Start AI analysis
      // startAIAnalysis();
    }
  }, [isCapturing, capturePhoto, startAIAnalysis]);

  const stopPhotoCapture = useCallback(() => {
    if (isCapturing) {
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current);
        photoIntervalRef.current = null;
        console.log('Interval cleared');
      }
      setIsCapturing(false);
      setPhotoCount(0);
      
      // Stop AI analysis
      // stopAIAnalysis();
    }
  }, [isCapturing, stopAIAnalysis]);

  const takeSinglePhoto = useCallback(() => {
    capturePhoto();
  }, [capturePhoto]);

  const handleTap = useCallback(() => {
    const TAP_DELAY = 400;

    tapCountRef.current++;
    console.log('Tap detected, count:', tapCountRef.current);

    // Clear any existing timeout to prevent multiple timeouts
    if (window.tapTimeout) {
      clearTimeout(window.tapTimeout);
    }

    // Set new timeout
    window.tapTimeout = setTimeout(() => {
      const currentTapCount = tapCountRef.current;
      console.log('Processing tap count:', currentTapCount);
      
      if (currentTapCount === 2) {
        console.log('Double tap detected!');
        if (isCapturing) {
          console.log('Stopping photo capture...');
          stopPhotoCapture();
        } else {
          console.log('Starting photo capture...');
          startPhotoCapture();
        }
      } else if (currentTapCount >= 3) {
        console.log('Triple tap detected!');
        takeSinglePhoto();
      }
      
      // Reset tap count
      tapCountRef.current = 0;
    }, TAP_DELAY);
  }, [isCapturing, startPhotoCapture, stopPhotoCapture, takeSinglePhoto]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAIAnalysis();
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current);
      }
    };
  }, [stopAIAnalysis]);

  return (
    <div className="fixed inset-0 bg-black z-50" onClick={handleTap}>
      {error ? (
        <div className="h-full flex items-center justify-center p-4 bg-black">
          <div className="text-center text-white max-w-xs">
            <CameraIcon size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-4 text-gray-300">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          {isCapturing && (
            <>
              <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                📸 CAPTURING ({photoCount})
              </div>
              {aiDescription && (
                <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">AI Analysis</span>
                  </div>
                  <p className="text-sm">{aiDescription}</p>
                </div>
              )}
              {isAnalyzing && !aiDescription && (
                <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Analyzing...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
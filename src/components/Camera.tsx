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
  const [error, setError] = useState<string | null>(null);
  const [facingMode] = useState<'user' | 'environment'>('environment');
  const [aiDescription, setAiDescription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDangerous, setIsDangerous] = useState(false);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

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
    // Initialize alert audio
    alertAudioRef.current = new Audio('/alerta.mp3');
    alertAudioRef.current.preload = 'auto';
  }, [startCamera]);

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

  const playAlertSound = useCallback(() => {
    if (alertAudioRef.current) {
      alertAudioRef.current.currentTime = 0; // Reset to beginning
      alertAudioRef.current.play().catch(error => {
        console.error('Error playing alert sound:', error);
      });
    }
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
        
        // Ensure we have the proper structure, even if the API response is malformed
        let isDangerous = false;
        let description = '';
        
        if (data && typeof data === 'object') {
          // If we got a proper JSON object from the API
          isDangerous = Boolean(data.danger);
          description = String(data.description || 'No se pudo analizar la imagen');
        } else if (typeof data === 'string') {
          // If we got a string, try to parse it or use it directly
          try {
            const parsed = JSON.parse(data);
            isDangerous = Boolean(parsed.danger);
            description = String(parsed.description || 'No se pudo analizar la imagen');
          } catch {
            // If parsing fails, treat as normal description
            isDangerous = false;
            description = data;
          }
        } else {
          description = 'No se pudo analizar la imagen';
        }
        
        // Clean up description - remove any JSON formatting if it leaked through
        description = description.replace(/^.*?"description":\s*"?/, '').replace(/".*$/, '').trim();
        if (description.includes('json') || description.includes('{') || description.includes('}')) {
          // If there's still JSON formatting, extract just the meaningful part
          const match = description.match(/(?:Delante tuya|Cuidado)[^{}]*?(?=\s*[{}]|$)/i);
          if (match) {
            description = match[0].trim();
          }
        }
        
        if (isDangerous) {
          setIsDangerous(true);
          // Play alert sound first
          playAlertSound();
          
          // Wait a moment for the sound to play, then speak the warning
          setTimeout(() => {
            setAiDescription(description);
            speakText(description);
          }, 500);
          
          // Reset danger state after a few seconds
          setTimeout(() => {
            setIsDangerous(false);
          }, 3000);
        } else {
          setIsDangerous(false);
          setAiDescription(description);
          speakText(description);
        }
      } else {
        console.error('Failed to analyze frame:', response.statusText);
        speakText('Error al analizar la imagen');
      }
    } catch (error) {
      console.error('Error analyzing frame:', error);
      speakText('Error al procesar la imagen');
    } finally {
      setIsAnalyzing(false);
    }
  }, [playAlertSound]);

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES'; // Spanish language
      utterance.rate = 1.4; // Faster speech rate for quicker feedback
      utterance.volume = 1.0;
      utterance.pitch = 1.0; // Normal pitch for clarity
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        console.error('Speech synthesis error');
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported');
    }
  }, []);

  const analyzeCurrentFrame = useCallback(() => {
    const frameData = captureFrameForAI();
    if (frameData) {
      analyzeFrame(frameData);
    }
  }, [captureFrameForAI, analyzeFrame]);

  const handleTap = useCallback(() => {
    console.log('Single tap detected! Analyzing current view...');
    analyzeCurrentFrame();
  }, [analyzeCurrentFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
          {isAnalyzing && (
            <div className={`absolute top-4 left-4 right-4 ${isDangerous ? 'bg-red-600' : 'bg-blue-600'} bg-opacity-90 text-white p-4 rounded-lg`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 ${isDangerous ? 'bg-yellow-300' : 'bg-white'} rounded-full animate-pulse`}></div>
                <span className="text-sm font-medium">
                  {isDangerous ? '⚠️ Analizando peligros...' : 'Analizando imagen...'}
                </span>
              </div>
            </div>
          )}
          {isDangerous && !isAnalyzing && (
            <div className="absolute top-4 left-4 right-4 bg-red-600 bg-opacity-95 text-white p-4 rounded-lg border-2 border-yellow-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
                <span className="text-lg font-bold">⚠️ ¡PELIGRO!</span>
              </div>
            </div>
          )}
          {aiDescription && (
            <div className={`absolute bottom-4 left-4 right-4 ${isDangerous ? 'bg-red-900' : 'bg-black'} bg-opacity-90 text-white p-4 rounded-lg ${isDangerous ? 'border-2 border-red-400' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                {isSpeaking ? (
                  <>
                    <div className={`w-2 h-2 ${isDangerous ? 'bg-yellow-400' : 'bg-green-500'} rounded-full animate-pulse`}></div>
                    <span className="text-sm font-medium">
                      {isDangerous ? '⚠️ Alerta de seguridad...' : '🔊 Hablando...'}
                    </span>
                  </>
                ) : (
                  <>
                    <div className={`w-2 h-2 ${isDangerous ? 'bg-red-500' : 'bg-blue-500'} rounded-full`}></div>
                    <span className="text-sm font-medium">
                      {isDangerous ? 'Alerta de peligro' : 'Descripción'}
                    </span>
                  </>
                )}
              </div>
              <p className={`text-sm ${isDangerous ? 'font-semibold' : ''}`}>{aiDescription}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
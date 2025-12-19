import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, XCircle } from 'lucide-react';
import { Button } from './Button';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, isScanning, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const animationRef = useRef<number>(0);

  const scan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      setLoading(false);
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        onScan(code.data);
        return; // Stop scanning loop on success
      }
    }
    animationRef.current = requestAnimationFrame(scan);
  }, [isScanning, onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setLoading(true);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Required for iOS/Android to play inline
          videoRef.current.setAttribute("playsinline", "true"); 
          videoRef.current.play().then(() => {
             animationRef.current = requestAnimationFrame(scan);
          });
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Unable to access camera. Please ensure you have granted permissions.");
        setLoading(false);
      }
    };

    if (isScanning) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, scan]);

  if (!isScanning) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl relative">
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <span className="font-medium">Scan Student QR</span>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full transition-colors">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-white text-center p-6">
              <p className="mb-4">{error}</p>
              <Button variant="secondary" onClick={onClose}>Close Scanner</Button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover" 
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scan Overlay */}
              <div className="absolute inset-0 m-12 pointer-events-none">
                 {/* Dark Background Mask (Static) */}
                 <div className="absolute inset-0 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.5)]"></div>

                 {/* Pulsing Border Indicator & Glow */}
                 <div className="absolute inset-0 rounded-lg border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse"></div>

                 {/* Corner Brackets */}
                 <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-sm"></div>
                 <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-sm"></div>
                 <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-sm"></div>
                 <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-sm"></div>
              </div>

              {/* Loading Indicator */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Starting Camera...</span>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 text-center text-sm text-gray-500">
          Point camera at a Student QR Code
        </div>
      </div>
    </div>
  );
};
import { useState, useRef, useEffect } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Camera, Loader2 } from "lucide-react";

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);

  const stopScanner = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    
    try {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      }
    } catch (err) {
      console.log("Scanner cleanup:", err);
    } finally {
      isStoppingRef.current = false;
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  useEffect(() => {
    isMountedRef.current = true;
    const containerId = "qr-reader-container";
    
    const startScanner = async () => {
      try {
        if (!isMountedRef.current) return;
        
        setIsStarting(true);
        setError(null);

        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        
        if (!isMountedRef.current) {
          html5QrCode.clear();
          return;
        }
        
        scannerRef.current = html5QrCode;

        const devices = await Html5Qrcode.getCameras();
        
        if (!isMountedRef.current) {
          html5QrCode.clear();
          return;
        }
        
        if (devices && devices.length > 0) {
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
          );
          const cameraId = backCamera?.id || devices[0].id;

          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              await stopScanner();
              if (isMountedRef.current) {
                onScan(decodedText);
              }
            },
            () => {}
          );
          
          if (isMountedRef.current) {
            setIsScanning(true);
            setIsStarting(false);
          }
        } else {
          if (isMountedRef.current) {
            setError("No cameras found. Please ensure camera access is allowed.");
            setIsStarting(false);
          }
        }
      } catch (err: unknown) {
        console.error("Camera error:", err);
        if (isMountedRef.current) {
          if (err instanceof Error) {
            if (err.message.includes("NotAllowedError") || err.message.includes("Permission denied")) {
              setError("Camera access denied. Please allow camera permissions in your browser settings.");
            } else if (err.message.includes("NotFoundError")) {
              setError("No camera found on this device.");
            } else {
              setError(err.message || "Failed to start camera. Please try again.");
            }
          } else {
            setError("Failed to start camera. Please try again.");
          }
          setIsStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [onScan]);

  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10"
        onClick={handleClose}
        data-testid="button-close-scanner"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="p-4">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Camera className="h-4 w-4" />
            <span>Point camera at QR code</span>
          </div>
        </div>
        
        {isStarting && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-destructive text-center mb-4">{error}</p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}
        
        <div 
          id="qr-reader-container" 
          className={`${isStarting || error ? 'hidden' : ''} rounded-lg overflow-hidden bg-black`}
          style={{ 
            minHeight: isScanning ? '320px' : '0',
            width: '100%',
          }}
        />
        
        {isScanning && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Align the QR code within the scanning box
          </p>
        )}
      </CardContent>
    </Card>
  );
}

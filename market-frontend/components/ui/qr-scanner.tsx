"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { QrCode, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QRScannerProps {
  onScanResult: (data: string) => void
  onError: (error: string) => void
  onClose: () => void
}

export function QRScanner({ onScanResult, onError, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  const startCamera = async () => {
    try {
      setIsScanning(true)
      setError(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use back camera on mobile
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      // For now, we'll simulate QR scanning after 3 seconds
      // In a real app, you'd use a QR code scanning library like jsQR
      setTimeout(() => {
        // Generate a more realistic product ID for testing
        const mockProductId = `PRD-${Date.now().toString().slice(-6)}`
        onScanResult(mockProductId)
        stopCamera()
      }, 3000)
      
    } catch (err) {
      setError("فشل في الوصول إلى الكاميرا")
      console.error("Camera access error:", err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    onError(errorMessage)
  }

  const handleCameraError = () => {
    handleError("فشل في الوصول إلى الكاميرا")
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={startCamera}>إعادة المحاولة</Button>
        </div>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-64 bg-black rounded-lg"
            onError={handleCameraError}
          />
          
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white rounded-lg w-48 h-48 opacity-50">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="text-center text-sm text-muted-foreground">
        {isScanning ? "وجه الكاميرا نحو الرمز المربع..." : "جاري التحضير..."}
      </div>
      
      <div className="flex justify-center">
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          إلغاء
        </Button>
      </div>
    </div>
  )
}

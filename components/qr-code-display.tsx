"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface QRCodeDisplayProps {
  baseUrl: string
}

export function QRCodeDisplay({ baseUrl }: QRCodeDisplayProps) {
  const [token, setToken] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState<number>(300) // 5 minutes in seconds
  const [mounted, setMounted] = useState(false)

  // Generate a new token
  const generateToken = () => {
    const newToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    setToken(newToken)
    setTimeLeft(300)
    // Store token in localStorage for validation
    if (typeof window !== "undefined") {
      localStorage.setItem("currentAttendanceToken", newToken)
      localStorage.setItem("tokenExpiry", (Date.now() + 300000).toString())
    }
  }

  useEffect(() => {
    setMounted(true)
    generateToken()

    // Set up interval to regenerate token every 5 minutes
    const tokenInterval = setInterval(() => {
      generateToken()
    }, 300000) // 5 minutes

    return () => {
      clearInterval(tokenInterval)
    }
  }, [])

  // Countdown timer
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 300
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const attendanceUrl = mounted && token ? `${baseUrl}/attend?token=${token}` : ""

  if (!mounted) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Scan to Check In</CardTitle>
          <CardDescription>Loading QR code...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pb-8">
          <div className="w-64 h-64 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary">Scan to Check In</CardTitle>
        <CardDescription>Use your phone to scan this QR code</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 pb-8">
        <div className="p-4 bg-white rounded-xl shadow-inner">
          <QRCodeSVG
            value={attendanceUrl}
            size={240}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#1a1a2e"
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">QR code refreshes in</p>
          <p className="text-3xl font-mono font-bold text-primary">{formatTime(timeLeft)}</p>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          This QR code changes every 5 minutes for security. Please scan promptly.
        </p>
      </CardContent>
    </Card>
  )
}

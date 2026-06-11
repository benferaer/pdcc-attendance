"use client"

import { useState, useEffect } from "react"
import { QRCodeDisplay } from "@/components/qr-code-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, List, CalendarPlus } from "lucide-react"
import Link from "next/link"

interface AttendanceRecord {
  id: string
  firstName: string
  lastName: string
  household: string
  cluster: string
  date: string
  time: string
  timestamp: number
}

export default function HomePage() {
  const [baseUrl, setBaseUrl] = useState("")
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Set base URL for QR code
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin)
    }

    // Load and filter today's attendance
    const loadAttendance = () => {
      const records: AttendanceRecord[] = JSON.parse(
        localStorage.getItem("attendanceRecords") || "[]"
      )
      
      // Get today's date string for comparison
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
      
      // Filter for today's records only
      const todayRecords = records.filter(record => record.date === today)
      
      // Sort by most recent first
      todayRecords.sort((a, b) => b.timestamp - a.timestamp)
      
      setRecentAttendance(todayRecords)
    }

    loadAttendance()
    // Refresh attendance list every 5 seconds
    const interval = setInterval(loadAttendance, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!mounted) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="h-96 bg-muted rounded max-w-md mx-auto"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <img src="/PDCC-logo.png" alt="Prayer Group Logo" className="h-22 w-22" />
            </div>
            <Link href="/records">
              <Button variant="outline" className="gap-2">
                <List className="w-4 h-4" />
                View All Records
              </Button>
            </Link>
            <Link href="/events/create">
              <Button className="gap-2">
                <CalendarPlus className="w-4 h-4" />
                Create Event
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* QR Code Section */}
          <section className="flex flex-col items-center">
            <QRCodeDisplay baseUrl={baseUrl} />
          </section>

          {/* Today's Attendance Section */}
          <section>
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{"Today's Attendance"}</CardTitle>
                    <CardDescription>
                      {recentAttendance.length} {recentAttendance.length === 1 ? "person" : "people"} checked in
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {recentAttendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No check-ins yet today</p>
                    <p className="text-sm mt-1">Attendees will appear here once they scan the QR code</p>
                  </div>
                ) : (
                <div>
                  <ul className="divide-y divide-border">
                    {recentAttendance.slice(0, 10).map((record) => (
                      <li key={record.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {record.firstName} {record.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{record.household}</p>
                          <p className="text-sm text-muted-foreground">{record.cluster}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{record.time}</span>
                      </li>
                    ))}
                    {recentAttendance.length > 10 && (
                      <li className="py-3 text-center">
                        <Link href="/records" className="text-sm text-primary hover:underline">
                          View all {recentAttendance.length} records
                        </Link>
                      </li>
                    )}
                  </ul>
                  <div className="flex justify-end">
                    <Button variant="destructive" className="mt-10 gap-2"
                        onClick={() => {
                        localStorage.removeItem("attendanceRecords")
                        location.reload() // optional: refresh UI
                    }}>
                        Clear Attendance
                    </Button>
                  </div>
                </div>)}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  )
}

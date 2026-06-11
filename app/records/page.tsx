"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, Trash2, Users, Calendar } from "lucide-react"
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

export default function RecordsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [groupedRecords, setGroupedRecords] = useState<Record<string, AttendanceRecord[]>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadRecords()
  }, [])

  const loadRecords = () => {
    const allRecords: AttendanceRecord[] = JSON.parse(
      localStorage.getItem("attendanceRecords") || "[]"
    )
    
    // Sort by most recent first
    allRecords.sort((a, b) => b.timestamp - a.timestamp)
    setRecords(allRecords)

    // Group by date
    const grouped: Record<string, AttendanceRecord[]> = {}
    allRecords.forEach((record) => {
      if (!grouped[record.date]) {
        grouped[record.date] = []
      }
      grouped[record.date].push(record)
    })
    setGroupedRecords(grouped)
  }

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to delete all attendance records? This cannot be undone.")) {
      localStorage.removeItem("attendanceRecords")
      setRecords([])
      setGroupedRecords({})
    }
  }

  const handleExportCSV = () => {
    if (records.length === 0) return

    const headers = ["Date", "Time", "First Name", "Last Name", "Household"]
    const csvContent = [
      headers.join(","),
      ...records.map((r) => [
        `"${r.date}"`,
        `"${r.time}"`,
        `"${r.firstName}"`,
        `"${r.lastName}"`,
        `"${r.household}"`
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `prayer-group-attendance-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-48"></div>
            <div className="h-64 bg-muted rounded"></div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-primary">Attendance Records</h1>
                <p className="text-muted-foreground">
                  {records.length} total {records.length === 1 ? "record" : "records"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExportCSV}
                disabled={records.length === 0}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={handleClearAll}
                disabled={records.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {records.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Records Yet</h2>
              <p className="text-muted-foreground mb-4">
                Attendance records will appear here once people check in.
              </p>
              <Link href="/">
                <Button>Go to Check-In Screen</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedRecords).map(([date, dateRecords]) => (
              <Card key={date} className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{date}</CardTitle>
                      <CardDescription>
                        {dateRecords.length} {dateRecords.length === 1 ? "attendee" : "attendees"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Time</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Household</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Cluster</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateRecords.map((record) => (
                          <tr key={record.id} className="border-b border-border last:border-0">
                            <td className="py-3 px-2 text-sm text-muted-foreground">{record.time}</td>
                            <td className="py-3 px-2 font-medium text-foreground">
                              {record.firstName} {record.lastName}
                            </td>
                            <td className="py-3 px-2 text-foreground">{record.household}</td>
                            <td className="py-3 px-2 text-foreground">{record.cluster}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

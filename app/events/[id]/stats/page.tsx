"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, BarChart3, Users, UserCheck, UserX, AlertCircle } from "lucide-react"
import Link from "next/link"
import {
  PLACEHOLDER_HOUSEHOLDS,
  type PrayerEvent,
  type EventAttendance,
  type Household,
} from "@/lib/data"

interface HouseholdStats {
  household: Household
  attended: string[]
  notAttended: string[]
}

export default function EventStatsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = use(params)
  const [mounted, setMounted] = useState(false)
  const [event, setEvent] = useState<PrayerEvent | null>(null)
  const [attendance, setAttendance] = useState<EventAttendance[]>([])
  const [householdStats, setHouseholdStats] = useState<HouseholdStats[]>([])
  const [totalExpected, setTotalExpected] = useState(0)
  const [totalAttended, setTotalAttended] = useState(0)

  useEffect(() => {
    setMounted(true)

    // Load event
    const events: PrayerEvent[] = JSON.parse(
      localStorage.getItem("prayerGroupEvents") || "[]"
    )
    const foundEvent = events.find((e) => e.id === eventId)
    setEvent(foundEvent || null)

    if (foundEvent) {
      // Load attendance for this event
      const allAttendance: EventAttendance[] = JSON.parse(
        localStorage.getItem("eventAttendance") || "[]"
      )
      const eventAttendance = allAttendance.filter((a) => a.eventId === eventId)
      setAttendance(eventAttendance)

      // Calculate stats per household
      const attendedMemberIds = new Set(eventAttendance.map((a) => a.memberId))
      const stats: HouseholdStats[] = []
      let expected = 0
      let attended = 0

      foundEvent.householdIds.forEach((householdId) => {
        const household = PLACEHOLDER_HOUSEHOLDS.find((h) => h.id === householdId)
        if (household) {
          const attendedMembers: string[] = []
          const notAttendedMembers: string[] = []

          household.members.forEach((member) => {
            const fullName = `${member.firstName} ${member.lastName}`
            if (attendedMemberIds.has(member.id)) {
              attendedMembers.push(fullName)
              attended++
            } else {
              notAttendedMembers.push(fullName)
            }
          })

          expected += household.members.length
          stats.push({
            household,
            attended: attendedMembers,
            notAttended: notAttendedMembers,
          })
        }
      })

      setHouseholdStats(stats)
      setTotalExpected(expected)
      setTotalAttended(attended)
    }
  }, [eventId])

  const attendancePercentage =
    totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : 0

  if (!mounted) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-muted rounded w-48"></div>
            <div className="h-96 bg-muted rounded max-w-2xl mx-auto"></div>
          </div>
        </div>
      </main>
    )
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Event Not Found
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    This event may have been deleted or does not exist.
                  </p>
                </div>
                <Link href="/">
                  <Button>Back to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary text-balance">
                {event.name} - Stats
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">{event.date}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Summary Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Attendance Summary</CardTitle>
                  <CardDescription>
                    Overall attendance for this event
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* Total Attended */}
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-center mb-2">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-green-700">
                    {totalAttended}
                  </p>
                  <p className="text-sm text-green-600">Attended</p>
                </div>

                {/* Total Expected */}
                <div className="text-center p-4 bg-secondary rounded-lg border border-border">
                  <div className="flex justify-center mb-2">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {totalExpected}
                  </p>
                  <p className="text-sm text-muted-foreground">Expected</p>
                </div>

                {/* Not Attended */}
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex justify-center mb-2">
                    <UserX className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-3xl font-bold text-orange-700">
                    {totalExpected - totalAttended}
                  </p>
                  <p className="text-sm text-orange-600">Missing</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Attendance Rate</span>
                  <span className="font-medium text-foreground">
                    {attendancePercentage}%
                  </span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-Household Breakdown */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Household Breakdown</CardTitle>
              <CardDescription>
                Attendance details by household
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {householdStats.map((stats) => (
                <div
                  key={stats.household.id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">
                      {stats.household.name} Household
                    </h3>
                    <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
                      {stats.attended.length}/{stats.household.members.length}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Attended */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          Attended ({stats.attended.length})
                        </span>
                      </div>
                      {stats.attended.length > 0 ? (
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {stats.attended.map((name) => (
                            <li key={name} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              {name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          None yet
                        </p>
                      )}
                    </div>

                    {/* Not Attended */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserX className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">
                          Not Attended ({stats.notAttended.length})
                        </span>
                      </div>
                      {stats.notAttended.length > 0 ? (
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {stats.notAttended.map((name) => (
                            <li key={name} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              {name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Everyone attended!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Attendance Log */}
          {attendance.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Attendance Log</CardTitle>
                <CardDescription>
                  All check-ins in order of time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {attendance
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((record) => (
                      <li
                        key={record.id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {record.memberName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.householdName} Household
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(record.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}

"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarPlus, Calendar, UserCheck, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { UpcomingEvents } from "@/components/upcoming-events"
import { MembersDropdown } from "@/components/members-dropdown"
import { BottomNav } from "@/components/bottom-nav"
import { EventsDropdown } from "@/components/events-dropdown"

interface PrayerEvent {
  id: string
  name: string
  date: string
  createdAt: number
}

interface EventAttendance {
  id: string
  eventId: string
  memberId: string
  memberName: string
  householdId: string
  householdName: string
  timestamp: number
}

interface WeekEventWithAttendance {
  event: PrayerEvent
  attendance: EventAttendance[]
  expected: number
}

// --- Date helpers -----------------------------------------------------

/** Returns YYYY-MM-DD for a Date in local time (no UTC shift). */
function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Returns the Sunday (start of week) for the week containing `date`, offset by `weekOffset` weeks. */
function getWeekStart(date: Date, weekOffset: number): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sunday
  d.setDate(d.getDate() - day + weekOffset * 7)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatWeekRangeLabel(weekStart: Date, weekEnd: Date): string {
  const startMonth = weekStart.toLocaleDateString(undefined, { month: "short" })
  const endMonth = weekEnd.toLocaleDateString(undefined, { month: "short" })
  const startDay = weekStart.getDate()
  const endDay = weekEnd.getDate()
  const year = weekEnd.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

export default function HomePage() {
  const [weekEvents, setWeekEvents] = useState<WeekEventWithAttendance[]>([])
  const [mounted, setMounted] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // 0 = current week. Negative values = past weeks. Capped at 0 (no future weeks).
  const [weekOffset, setWeekOffset] = useState(0)

  const { weekStart, weekEnd, isCurrentWeek } = useMemo(() => {
    const start = getWeekStart(new Date(), weekOffset)
    const end = addDays(start, 6)
    return { weekStart: start, weekEnd: end, isCurrentWeek: weekOffset === 0 }
  }, [weekOffset])

  const selectedEvent = weekEvents.find((e) => e.event.id === selectedEventId)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadWeekEvents = async () => {
      const startStr = toLocalDateString(weekStart)
      const endStr = toLocalDateString(weekEnd)

      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("*")
        .gte("meeting_date", startStr)
        .lte("meeting_date", endStr)
        .order("meeting_date", { ascending: true })

      if (meetingsError) {
        console.error("Error loading week's meetings:", meetingsError)
        return
      }

      if (cancelled) return

      if (!meetingsData || meetingsData.length === 0) {
        setWeekEvents([])
        setSelectedEventId(null)
        return
      }

      const meetingIds = meetingsData.map((m) => m.id)

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select(`
          id,
          meeting_id,
          marked_at,
          member:members!attendance_member_id_fkey (
            id,
            first_name,
            last_name,
            household_id,
            household:households!members_household_id_fkey (
              id,
              household_name
            )
          )
        `)
        .in("meeting_id", meetingIds)

      if (attendanceError) {
        console.error("Error loading attendance data:", attendanceError)
        return
      }

      if (cancelled) return

      const { data: meetingHouseholdsData } = await supabase
        .from("meeting_households")
        .select("meeting_id, household_id")
        .in("meeting_id", meetingIds)

      const { data: membersData } = await supabase
        .from("members")
        .select("id, household_id")
        .eq("active", true)

      if (cancelled) return

      const expectedByMeeting: Record<string, number> = {}
      for (const meeting of meetingsData) {
        const invitedHouseholdIds = (meetingHouseholdsData ?? [])
          .filter((mh) => mh.meeting_id === meeting.id)
          .map((mh) => mh.household_id)
        expectedByMeeting[meeting.id] = (membersData ?? []).filter((m) =>
          invitedHouseholdIds.includes(m.household_id)
        ).length
      }

      const eventsWithAttendance: WeekEventWithAttendance[] = meetingsData.map((meeting) => {
        const eventAttendance = (attendanceData ?? [])
          .filter((a) => a.meeting_id === meeting.id)
          .map((a) => {
            const member = a.member as any
            const household = member?.household
            return {
              id: a.id,
              eventId: a.meeting_id,
              memberId: member?.id ?? "",
              memberName: `${member?.first_name ?? ""} ${member?.last_name ?? ""}`.trim(),
              householdId: member?.household_id ?? "",
              householdName: household?.household_name ?? "",
              timestamp: new Date(a.marked_at).getTime(),
            }
          })
        return {
          event: {
            id: meeting.id,
            name: meeting.title ?? "Untitled Meeting",
            date: meeting.meeting_date,
            createdAt: new Date(meeting.created_at).getTime(),
          },
          attendance: eventAttendance,
          expected: expectedByMeeting[meeting.id] ?? 0,
        }
      })

      if (cancelled) return

      setWeekEvents(eventsWithAttendance)
      setSelectedEventId((prev) => {
        if (prev && eventsWithAttendance.find((e) => e.event.id === prev)) return prev
        return eventsWithAttendance[0]?.event.id ?? null
      })
    }

    loadWeekEvents()
    // Only auto-refresh while viewing the current week, since past weeks are static.
    const interval = isCurrentWeek ? setInterval(loadWeekEvents, 5000) : null
    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [weekStart, weekEnd, isCurrentWeek])

  const totalAttendedWeek = weekEvents.reduce((sum, e) => sum + e.attendance.length, 0)
  const totalExpectedWeek = weekEvents.reduce((sum, e) => sum + e.expected, 0)

  const goToPreviousWeek = () => setWeekOffset((prev) => prev - 1)
  const goToNextWeek = () => setWeekOffset((prev) => Math.min(prev + 1, 0))
  const goToCurrentWeek = () => setWeekOffset(0)

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
    <main className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="border-b border-border bg-card bg-red-600">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <Link href="/">
                  <img src="/PDCC-logo.png" alt="Prayer Group Logo" className="h-16 w-16 md:h-22 md:w-22 object-contain cursor-default" />
                </Link>
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-xl md:text-3xl font-bold" style={{ fontFamily: '"Times New Roman", Times, serif', color: "#FFFFFF" }}>
                  Pag-Ibig sa Diyos Catholic Community
                </h1>
                <h2 className="text-lg md:text-[26px] font-semibold" style={{ fontFamily: '"Times New Roman", Times, serif', color: "#FFFFFF" }}>
                  Holy Family Prayer Group
                </h2>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="hidden md:block">
                <EventsDropdown />
              </div>
              <div className="hidden md:block">
                <MembersDropdown />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* This Week's Events */}
        <section>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Section header */}
            <div className="px-5 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <UserCheck className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {isCurrentWeek ? "This Week's Events" : "Week's Events"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {weekEvents.length === 0
                      ? "No events scheduled this week"
                      : `${weekEvents.length} event${weekEvents.length > 1 ? "s" : ""} · ${totalAttendedWeek}/${totalExpectedWeek} checked in`}
                  </p>
                </div>
              </div>

              {/* Week navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  onClick={goToPreviousWeek}
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <button
                  onClick={goToCurrentWeek}
                  className={`text-sm px-2 py-1 rounded-md transition-colors text-center min-w-[150px] ${
                    isCurrentWeek
                      ? "text-foreground font-medium cursor-default"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  }`}
                  disabled={isCurrentWeek}
                  aria-label="Jump to current week"
                >
                  {formatWeekRangeLabel(weekStart, weekEnd)}
                  {!isCurrentWeek && (
                    <span className="block text-xs text-primary">Back to this week →</span>
                  )}
                </button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={goToNextWeek}
                  disabled={isCurrentWeek}
                  aria-label="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {weekEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No events scheduled for this week</p>
                {isCurrentWeek && (
                  <>
                    <p className="text-sm mt-1">Create an event to start tracking attendance</p>
                    <Link href="/events/create">
                      <Button variant="outline" className="mt-4 gap-2 cursor-pointer">
                        <CalendarPlus className="w-4 h-4" />
                        Create Event
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: stacked cards */}
                <div className="md:hidden divide-y divide-border">
                  {weekEvents.map(({ event, attendance, expected }) => (
                    <Link key={event.id} href={`/events/${event.id}/checkins`}>
                      <div className="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-sm">{event.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {attendance.length}/{expected}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {formatDayLabel(new Date(`${event.date}T00:00:00`))}
                        </p>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: expected > 0 ? `${Math.round((attendance.length / expected) * 100)}%` : "0%" }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {expected > 0 ? `${Math.round((attendance.length / expected) * 100)}% checked in` : "No expected members"}
                          </span>
                          <span className="text-xs text-primary">View →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Desktop: sidebar + detail */}
                <div className="hidden md:flex" style={{ minHeight: 360 }}>
                  {/* Sidebar */}
                  <div
                    className="border-r border-border flex flex-col transition-all duration-200"
                    style={{ width: sidebarCollapsed ? 52 : 220 }}
                  >
                    {/* Toggle button */}
                    <div className="flex items-center justify-center p-2 border-b border-border">
                      <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                      >
                        {sidebarCollapsed
                          ? <ChevronRight className="w-4 h-4" />
                          : <ChevronLeft className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Event list */}
                    <div className="flex-1 py-2 overflow-y-auto">
                      {weekEvents.map(({ event, attendance, expected }) => {
                        const isActive = selectedEventId === event.id
                        const dayLabel = formatDayLabel(new Date(`${event.date}T00:00:00`))
                        return (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEventId(event.id)}
                            className={`w-full text-left transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/50"}`}
                          >
                            {sidebarCollapsed ? (
                              /* Collapsed: dot + fraction */
                              <div className="flex flex-col items-center gap-1 py-3 px-1">
                                <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-blue-500" : "bg-muted-foreground/40"}`} />
                                <span className={`text-[10px] font-medium leading-tight ${isActive ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"}`}>
                                  {attendance.length}/{expected}
                                </span>
                              </div>
                            ) : (
                              /* Expanded: full card */
                              <div className="px-3 py-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm font-medium truncate ${isActive ? "text-blue-800 dark:text-blue-200" : "text-foreground"}`}>
                                    {event.name}
                                  </span>
                                  <span className={`text-xs ml-2 shrink-0 ${isActive ? "text-blue-600 dark:text-blue-300" : "text-muted-foreground"}`}>
                                    {attendance.length}/{expected}
                                  </span>
                                </div>
                                <p className={`text-xs mb-1 ${isActive ? "text-blue-600 dark:text-blue-300" : "text-muted-foreground"}`}>
                                  {dayLabel}
                                </p>
                                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${isActive ? "bg-blue-500" : "bg-muted-foreground/40"}`}
                                    style={{ width: expected > 0 ? `${Math.round((attendance.length / expected) * 100)}%` : "0%" }}
                                  />
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Detail panel */}
                  <div className="flex-1 overflow-hidden">
                    {selectedEvent ? (
                      <div className="h-full flex flex-col">
                        {/* Detail header */}
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{selectedEvent.event.name}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {formatDayLabel(new Date(`${selectedEvent.event.date}T00:00:00`))}
                              {" · "}
                              {selectedEvent.attendance.length} of {selectedEvent.expected} checked in
                              {selectedEvent.expected > 0 && ` · ${Math.round((selectedEvent.attendance.length / selectedEvent.expected) * 100)}%`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/events/${selectedEvent.event.id}/attend`}>
                              <Button size="sm" className="gap-2 cursor-pointer">
                                <UserCheck className="w-4 h-4" />
                                Check In
                              </Button>
                            </Link>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="px-5 py-2 border-b border-border">
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{
                                width: selectedEvent.expected > 0
                                  ? `${Math.round((selectedEvent.attendance.length / selectedEvent.expected) * 100)}%`
                                  : "0%"
                              }}
                            />
                          </div>
                        </div>

                        {/* Attendance list */}
                        <div className="flex-1 overflow-y-auto">
                          {selectedEvent.attendance.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                              <p className="text-sm">No check-ins yet</p>
                            </div>
                          ) : (
                            <ul className="divide-y divide-border">
                              {selectedEvent.attendance.map((record) => (
                                <li key={record.id} className="px-5 py-3 flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{record.memberName}</p>
                                    <p className="text-xs text-muted-foreground">{record.householdName} Household</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(record.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Footer link */}
                        {selectedEvent.attendance.length > 0 && (
                          <div className="px-5 py-3 border-t border-border">
                            <Link href={`/events/${selectedEvent.event.id}/checkins`} className="text-xs text-primary hover:underline">
                              View checkins →
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Upcoming Events */}
          <section>
            <UpcomingEvents afterDate={toLocalDateString(weekEnd)} />
          </section>
      </div>
      <BottomNav />
    </main>
  )
}

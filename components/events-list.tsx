"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar, Users, BarChart3, Search, X } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface Event {
  id: string
  name: string
  date: string
  createdAt: number
}

export function EventsList() {
  const [events, setEvents] = useState<Event[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    const loadEvents = async () => {
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("id, title, meeting_date, created_at")
        .order("created_at", { ascending: false })

      if (meetingsError) {
        console.error("Error loading meetings:", meetingsError)
        return
      }

      setEvents(
        (meetingsData ?? []).map((m) => ({
          id: m.id,
          name: m.title ?? "Untitled Meeting",
          date: m.meeting_date,
          createdAt: new Date(m.created_at).getTime(),
        }))
      )

      // Load attendance counts per meeting
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("meeting_id")

      if (attendanceError) {
        console.error("Error loading attendance:", attendanceError)
        return
      }

      const counts: Record<string, number> = {}
      ;(attendanceData ?? []).forEach((a) => {
        counts[a.meeting_id] = (counts[a.meeting_id] || 0) + 1
      })
      setAttendanceCounts(counts)
    }

    loadEvents()
    const interval = setInterval(loadEvents, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesName = event.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDate = dateFilter ? event.date.includes(dateFilter) : true
      return matchesName && matchesDate
    })
  }, [events, searchQuery, dateFilter])

  const clearFilters = () => {
    setSearchQuery("")
    setDateFilter("")
  }

  const hasFilters = searchQuery || dateFilter

  if (events.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">All Events</CardTitle>
              <CardDescription>No events created yet</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No events have been created</p>
            <p className="text-sm mt-1">Create your first event to get started</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">All Events</CardTitle>
            <CardDescription>
              {events.length} {events.length === 1 ? "event" : "events"} total
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter by date (YYYY-MM-DD)..."
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Results count when filtered */}
        {hasFilters && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} events
          </p>
        )}

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No events match your filters</p>
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredEvents.map((event) => {
              const attended = attendanceCounts[event.id] || 0

              return (
                <li
                  key={event.id}
                  className="border border-border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                          <Users className="w-3 h-3" />
                          {attended} attended
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{event.date}</p>
                    </div>

                    <Link href={`/events/${event.id}/stats`} className="shrink-0">
                      <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                        <BarChart3 className="w-4 h-4" />
                        View Stats
                      </Button>
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronRight } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { format, parseISO, isToday, isTomorrow } from "date-fns"

interface UpcomingEvent {
  id: string
  title: string
  meeting_date: string
  household_count: number
}

const PAGE_SIZE = 5

export function UpcomingEvents({ afterDate }: { afterDate: string }) {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const loadUpcoming = async () => {
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("id, title, meeting_date")
        .gt("meeting_date", afterDate)
        .order("meeting_date")

      if (meetingsError) {
        console.error("Error loading upcoming events:", meetingsError)
        setIsLoading(false)
        return
      }

      if (!meetingsData || meetingsData.length === 0) {
        setEvents([])
        setIsLoading(false)
        return
      }

      const meetingIds = meetingsData.map((m) => m.id)

      const { data: mhData } = await supabase
        .from("meeting_households")
        .select("meeting_id")
        .in("meeting_id", meetingIds)

      const householdCounts: Record<string, number> = {}
      ;(mhData ?? []).forEach((mh) => {
        householdCounts[mh.meeting_id] = (householdCounts[mh.meeting_id] || 0) + 1
      })

      setEvents(
        meetingsData.map((m) => ({
          id: m.id,
          title: m.title ?? "Untitled Meeting",
          meeting_date: m.meeting_date,
          household_count: householdCounts[m.id] ?? 0,
        }))
      )
      setIsLoading(false)
    }

    loadUpcoming()
  }, [afterDate])

  const visibleEvents = showAll ? events : events.slice(0, PAGE_SIZE)

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return "Today"
    if (isTomorrow(date)) return "Tomorrow"
    return format(date, "EEE, MMM d")
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Upcoming Events</h2>
          <p className="text-sm text-muted-foreground">
            {events.length === 0
              ? "Nothing scheduled yet"
              : `${events.length} event${events.length > 1 ? "s" : ""} scheduled`}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No upcoming events scheduled</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visibleEvents.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}/checkins`}>
                  <div className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateLabel(event.meeting_date)} · {format(parseISO(event.meeting_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {event.household_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {event.household_count} household{event.household_count > 1 ? "s" : ""}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {events.length > PAGE_SIZE && (
            <div className="px-5 py-3 border-t border-border text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-primary hover:underline"
              >
                {showAll ? "Show less" : `Show ${events.length - PAGE_SIZE} more`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
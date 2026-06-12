"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, UserCheck, Clock, Users } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface Member {
  id: string
  firstName: string
  lastName: string
  householdName: string
  checkedIn: boolean
  checkedInAt?: number
}

interface MeetingInfo {
  id: string
  title: string
  meeting_date: string
}

export default function CheckinsPage() {
  const params = useParams()
  const id = params.id as string

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    // Load meeting info
    const { data: meetingData, error: meetingError } = await supabase
      .from("meetings")
      .select("id, title, meeting_date")
      .eq("id", id)
      .single()

    if (meetingError || !meetingData) {
      console.error("Error loading meeting:", meetingError)
      setIsLoading(false)
      return
    }

    setMeeting(meetingData)

    // Load invited households for this meeting
    const { data: meetingHouseholds, error: mhError } = await supabase
      .from("meeting_households")
      .select("household_id")
      .eq("meeting_id", id)

    if (mhError) {
      console.error("Error loading meeting households:", mhError)
      setIsLoading(false)
      return
    }

    const householdIds = (meetingHouseholds ?? []).map((mh) => mh.household_id)

    if (householdIds.length === 0) {
      setMembers([])
      setIsLoading(false)
      return
    }

    // Load all active members in those households with their household name
    const { data: membersData, error: membersError } = await supabase
      .from("members")
      .select(`
        id,
        first_name,
        last_name,
        household:households!members_household_id_fkey (
          id,
          household_name
        )
      `)
      .in("household_id", householdIds)
      .eq("active", true)
      .order("last_name")
      .order("first_name")

    if (membersError) {
      console.error("Error loading members:", membersError)
      setIsLoading(false)
      return
    }

    // Load attendance for this meeting
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("member_id, marked_at")
      .eq("meeting_id", id)

    if (attendanceError) {
      console.error("Error loading attendance:", attendanceError)
      setIsLoading(false)
      return
    }

    const attendanceMap: Record<string, number> = {}
    ;(attendanceData ?? []).forEach((a) => {
      attendanceMap[a.member_id] = new Date(a.marked_at).getTime()
    })

    const allMembers: Member[] = (membersData ?? []).map((m: any) => ({
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      householdName: m.household?.household_name ?? "",
      checkedIn: !!attendanceMap[m.id],
      checkedInAt: attendanceMap[m.id],
    }))

    setMembers(allMembers)
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [id])

  const checkedIn = members
    .filter((m) => m.checkedIn)
    .sort((a, b) => (a.checkedInAt ?? 0) - (b.checkedInAt ?? 0))

  const notCheckedIn = members.filter((m) => !m.checkedIn)

  const pct = members.length > 0
    ? Math.round((checkedIn.length / members.length) * 100)
    : 0

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded w-48"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </main>
    )
  }

  if (!meeting) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Event not found</p>
          <Link href="/">
            <Button variant="link" className="mt-2">Back to home</Button>
          </Link>
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
              <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-primary truncate">{meeting.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{meeting.meeting_date}</p>
            </div>
            <Link href={`/events/${id}/attend`}>
              <Button className="gap-2 shrink-0 cursor-pointer">
                <UserCheck className="w-4 h-4" />
                Check In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Summary bar */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Overall attendance</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {checkedIn.length} / {members.length}
              <span className="text-muted-foreground font-normal ml-1">({pct}%)</span>
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Checked in */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              <h2 className="text-sm font-semibold text-foreground">Checked in</h2>
            </div>
            <Badge variant="secondary">{checkedIn.length}</Badge>
          </div>
          {checkedIn.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No check-ins yet
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {checkedIn.map((m) => (
                <li key={m.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {m.lastName}, {m.firstName}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.householdName} Household</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {m.checkedInAt
                      ? new Date(m.checkedInAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Not yet checked in */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Not yet checked in</h2>
            </div>
            <Badge variant="secondary">{notCheckedIn.length}</Badge>
          </div>
          {notCheckedIn.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Everyone has checked in 🎉
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notCheckedIn.map((m) => (
                <li key={m.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {m.lastName}, {m.firstName}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.householdName} Household</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Pending</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
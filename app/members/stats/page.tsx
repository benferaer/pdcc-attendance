"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

const TOTAL_EVENTS = 40
const REQUIREMENT_PCT = 35

interface MemberStat {
  id: string
  firstName: string
  lastName: string
  householdId: string
  householdName: string
  priorCount: number
  priorYear: number
  checkedInCount: number
  total: number
  percentage: number
  meetsRequirement: boolean
}

interface Household {
  id: string
  household_name: string
}

export default function MembersStatsPage() {
  const [members, setMembers] = useState<MemberStat[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const currentYear = 2026

      // Load all active members with household
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select(`
          id,
          first_name,
          last_name,
          household_id,
          prior_attendance_count,
          prior_attendance_year,
          household:households!members_household_id_fkey (
            id,
            household_name
          )
        `)
        .eq("active", true)
        .order("last_name")
        .order("first_name")

      if (membersError) {
        console.error("Error loading members:", membersError)
        setIsLoading(false)
        return
      }

      // Load all 2026 meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("id, meeting_date")
        .gte("meeting_date", `${currentYear}-01-01`)
        .lte("meeting_date", `${currentYear}-12-31`)

      if (meetingsError) {
        console.error("Error loading meetings:", meetingsError)
        setIsLoading(false)
        return
      }

      const meetingIds = (meetingsData ?? []).map((m) => m.id)

      // Load all attendance for 2026 meetings
      const { data: attendanceData, error: attendanceError } = meetingIds.length > 0
        ? await supabase
            .from("attendance")
            .select("member_id, meeting_id")
            .in("meeting_id", meetingIds)
        : { data: [], error: null }

      if (attendanceError) {
        console.error("Error loading attendance:", attendanceError)
        setIsLoading(false)
        return
      }

      // Count check-ins per member for 2026
      const checkinCounts: Record<string, number> = {}
      ;(attendanceData ?? []).forEach((a) => {
        checkinCounts[a.member_id] = (checkinCounts[a.member_id] || 0) + 1
      })

      // Build member stats
      const memberStats: MemberStat[] = (membersData ?? []).map((m: any) => {
        const household = m.household
        const checkedInCount = checkinCounts[m.id] || 0

        // Only add prior count if it's for the current year
        const priorCount = m.prior_attendance_year === currentYear
          ? (m.prior_attendance_count || 0)
          : 0

        const total = Math.min(checkedInCount + priorCount, TOTAL_EVENTS)
        const percentage = Math.round((total / TOTAL_EVENTS) * 100)

        return {
          id: m.id,
          firstName: m.first_name,
          lastName: m.last_name,
          householdId: m.household_id,
          householdName: household?.household_name ?? "—",
          priorCount,
          priorYear: m.prior_attendance_year,
          checkedInCount,
          total,
          percentage,
          meetsRequirement: percentage >= REQUIREMENT_PCT,
        }
      })

      setMembers(memberStats)

      // Unique households from members
      const seen = new Set<string>()
      const uniqueHouseholds: Household[] = []
      ;(membersData ?? []).forEach((m: any) => {
        if (m.household && !seen.has(m.household.id)) {
          seen.add(m.household.id)
          uniqueHouseholds.push(m.household)
        }
      })
      uniqueHouseholds.sort((a, b) => a.household_name.localeCompare(b.household_name))
      setHouseholds(uniqueHouseholds)

      setIsLoading(false)
    }

    loadData()
  }, [])

  const filtered = useMemo(() => {
    if (selectedHouseholdId === "all") return members
    return members.filter((m) => m.householdId === selectedHouseholdId)
  }, [members, selectedHouseholdId])

  const meetingCount = filtered.filter((m) => m.meetsRequirement).length
  const totalCount = filtered.length

  if (isLoading) {
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
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Member Attendance</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                2026 · {REQUIREMENT_PCT}% requirement ({Math.round(TOTAL_EVENTS * REQUIREMENT_PCT / 100)} of {TOTAL_EVENTS} events)
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Summary + filter row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {meetingCount} of {totalCount} members meet the attendance requirement
              </p>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0 ? Math.round((meetingCount / totalCount) * 100) : 0}% of
                {selectedHouseholdId === "all" ? " all members" : " this household"}
              </p>
            </div>
          </div>
          <Select value={selectedHouseholdId} onValueChange={setSelectedHouseholdId}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Filter by household" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All households</SelectItem>
              {households.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.household_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Members list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No members found</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((m) => {
                const barColor = m.meetsRequirement
                  ? "bg-green-500"
                  : m.percentage >= 20
                  ? "bg-amber-400"
                  : "bg-red-400"

                return (
                  <li key={m.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {m.lastName}, {m.firstName}
                          </span>
                          {m.meetsRequirement ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Meets requirement
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            </span> 
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.householdName} Household</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-semibold text-foreground">{m.percentage}%</span>
                        <p className="text-xs text-muted-foreground">{m.total}/{TOTAL_EVENTS}</p>
                      </div>
                    </div>

                    {/* Progress bar with 35% marker */}
                    <div className="relative w-full h-2 bg-muted rounded-full overflow-visible">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${m.percentage}%` }}
                      />
                      {/* 35% requirement marker */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/30 rounded-full"
                        style={{ left: `${REQUIREMENT_PCT}%` }}
                        title={`${REQUIREMENT_PCT}% requirement`}
                      />
                    </div>

                    {/* Breakdown */}
                    {m.priorCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {m.checkedInCount} from check-ins · {m.priorCount} prior carried over
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
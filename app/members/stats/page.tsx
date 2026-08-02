"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, CheckCircle2, Download, Loader2, BarChart3, FileText } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { REQUIREMENT_MEETING_TYPES, TOTAL_EVENTS, REQUIREMENT_PCT } from "@/lib/constants"
import { startOfWeek, endOfWeek, addWeeks, format, parseISO, isWithinInterval } from "date-fns"

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
]

function getWeeksForMonth(year: number, monthIndex: number, cutoff: Date) {
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)

  // Don't generate weeks for months entirely in the future
  if (firstDay > cutoff) return []

  // Clamp last day to today if this is the current month
  const effectiveLastDay = lastDay > cutoff ? cutoff : lastDay

  const weeks: { label: string; start: Date; end: Date }[] = []
  let current = startOfWeek(firstDay, { weekStartsOn: 0 })

  while (current <= effectiveLastDay) {
    const weekStart = current
    const weekEnd = endOfWeek(current, { weekStartsOn: 0 })
    const displayStart = weekStart < firstDay ? firstDay : weekStart
    const displayEnd = weekEnd > effectiveLastDay ? effectiveLastDay : weekEnd
    weeks.push({
      label: `${format(displayStart, "MMM d")}-${format(displayEnd, "d")}`,
      start: weekStart,
      end: weekEnd,
    })
    current = addWeeks(current, 1)
  }

  return weeks
}

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

type Tab = "stats" | "reports"

export default function MembersStatsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("stats")
  const [members, setMembers] = useState<MemberStat[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingMonthly, setIsGeneratingMonthly] = useState(false)
  const [isGeneratingStats, setIsGeneratingStats] = useState(false)
  const [selectedReportYear, setSelectedReportYear] = useState(String(new Date().getFullYear()))
  const [ytdMeetingCount, setYTDMeetingCount] = useState(0)

  const CURRENT_YEAR = new Date().getFullYear()
  const START_YEAR = 2026
  const YEARS = Array.from(
    { length: CURRENT_YEAR - START_YEAR + 1 }, 
    (_, i) => CURRENT_YEAR - i
  )

  useEffect(() => {
    const loadData = async () => {
      const currentYear = 2026

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

      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("id, meeting_date")
        .gte("meeting_date", `${currentYear}-01-01`)
        .lte("meeting_date", `${currentYear}-12-31`)
        .in("meeting_type", REQUIREMENT_MEETING_TYPES)

      if (meetingsError) {
        console.error("Error loading meetings:", meetingsError)
        setIsLoading(false)
        return
      }

      const meetingIds = (meetingsData ?? []).map((m) => m.id)

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

      const ytdMeetingCount = (meetingsData ?? []).length

      setYTDMeetingCount(ytdMeetingCount)

      const checkinCounts: Record<string, number> = {}
      ;(attendanceData ?? []).forEach((a) => {
        checkinCounts[a.member_id] = (checkinCounts[a.member_id] || 0) + 1
      })

      const memberStats: MemberStat[] = (membersData ?? []).map((m: any) => {
        const household = m.household
        const checkedInCount = checkinCounts[m.id] || 0
        const priorCount = m.prior_attendance_year === currentYear
          ? (m.prior_attendance_count || 0)
          : 0
        const total = Math.min(checkedInCount + priorCount, TOTAL_EVENTS)
        const percentage = ytdMeetingCount > 0
          ? Math.round((total / ytdMeetingCount) * 100)
          : 0

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
          meetsRequirement: Math.round((total / ytdMeetingCount) * 100) >= REQUIREMENT_PCT,
        }
      })

      setMembers(memberStats)

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
  const requirementCount = Math.round(ytdMeetingCount * REQUIREMENT_PCT / 100)
  const membersWithAttendance = filtered.filter((m) => m.total > 0)

  const triggerCSVDownload = (rows: (string | number)[][], filename: string) => {
    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell)
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          .join(",")
      )
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadAttendanceCSV = () => {
    if (membersWithAttendance.length === 0) return
    setIsGeneratingStats(true)

    const rows = [
      [
        "Last Name",
        "First Name",
        "Household",
        "Prior Count",
        "Check-in Count",
        "Total Attendance",
        `Out of (${ytdMeetingCount}) Events`,
        "Percentage",
        "Meets Requirement",
      ],
      ...membersWithAttendance.map((m) => {
        const remaining = Math.max(requirementCount - m.total, 0)
        return [
          m.lastName,
          m.firstName,
          m.householdName,
          m.priorCount,
          m.checkedInCount,
          m.total,
          ytdMeetingCount,
          `${m.percentage}%`,
          m.meetsRequirement ? "Yes" : "No",
        ]
      }),
    ]

    const householdSuffix = selectedHouseholdId !== "all"
      ? `-${households.find((h) => h.id === selectedHouseholdId)?.household_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? "household"}`
      : ""

    triggerCSVDownload(rows, `member-attendance-stats-2026${householdSuffix}.csv`)
    setIsGeneratingStats(false)
  }

  const downloadMonthlyCSV = async () => {
    setIsGeneratingMonthly(true)

    const year = parseInt(selectedReportYear)
    const isCurrentYear = year === CURRENT_YEAR
    const cutoffDate = isCurrentYear ? new Date() : new Date(year, 11, 31) // if current year, cutoff is today; otherwise, end of year

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
      .eq("active", true)
      .order("last_name")
      .order("first_name")

    if (membersError || !membersData) {
      console.error("Error loading members:", membersError)
      setIsGeneratingMonthly(false)
      return
    }

    const { data: meetingsData, error: meetingsError } = await supabase
      .from("meetings")
      .select("id, meeting_date")
      .gte("meeting_date", `${year}-01-01`)
      .lte("meeting_date", `${year}-12-31`)
      .in("meeting_type", REQUIREMENT_MEETING_TYPES)

    if (meetingsError) {
      console.error("Error loading meetings:", meetingsError)
      setIsGeneratingMonthly(false)
      return
    }

    const meetingIds = (meetingsData ?? []).map((m) => m.id)

    const { data: attendanceData, error: attendanceError } = meetingIds.length > 0
      ? await supabase
          .from("attendance")
          .select("member_id, meeting_id")
          .in("meeting_id", meetingIds)
      : { data: [], error: null }

    if (attendanceError) {
      console.error("Error loading attendance:", attendanceError)
      setIsGeneratingMonthly(false)
      return
    }

    const meetingDateMap: Record<string, string> = {}
    ;(meetingsData ?? []).forEach((m) => { meetingDateMap[m.id] = m.meeting_date })

    const memberAttendanceDates: Record<string, Set<string>> = {}
    ;(attendanceData ?? []).forEach((a) => {
      const date = meetingDateMap[a.meeting_id]
      if (!date) return
      if (!memberAttendanceDates[a.member_id]) {
        memberAttendanceDates[a.member_id] = new Set()
      }
      memberAttendanceDates[a.member_id].add(date)
    })

    const allWeeks: { label: string; start: Date; end: Date; monthIndex: number }[] = []
    for (let m = 0; m < 12; m++) {
      getWeeksForMonth(year, m, cutoffDate).forEach((w) =>
        allWeeks.push({ ...w, monthIndex: m })
      )
    }

    const getMemberWeekCount = (memberId: string, weekStart: Date, weekEnd: Date) => {
      const dates = memberAttendanceDates[memberId]
      if (!dates) return 0
      let count = 0
      dates.forEach((dateStr) => {
        if (isWithinInterval(parseISO(dateStr), { start: weekStart, end: weekEnd })) count++
      })
      return count
    }

    const monthRow: string[] = ["", "", ""]
    const weekRow: string[] = ["Last Name", "First Name", "Household"]

    for (let m = 0; m < 12; m++) {
      const weeks = allWeeks.filter((w) => w.monthIndex === m)
      if (weeks.length === 0) continue
      monthRow.push(MONTHS[m])
      for (let i = 1; i < weeks.length; i++) monthRow.push("")
      weeks.forEach((w) => weekRow.push(w.label))
    }

    monthRow.push("")
    weekRow.push("Total")

    const rows: (string | number)[][] = [monthRow, weekRow]

    membersData.forEach((m: any) => {
      const row: (string | number)[] = [
        m.last_name,
        m.first_name,
        m.household?.household_name ?? "—",
      ]
      let yearTotal = 0
      allWeeks.forEach(({ start, end }) => {
        const count = getMemberWeekCount(m.id, start, end)
        row.push(count)
        yearTotal += count
      })
      row.push(yearTotal)
      rows.push(row)
    })

    triggerCSVDownload(rows, `monthly-attendance-report-${year}.csv`)
    setIsGeneratingMonthly(false)
  }

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
              {/* <p className="text-sm text-muted-foreground mt-0.5">
                2026 · {REQUIREMENT_PCT}% requirement ({requirementCount} of {TOTAL_EVENTS} events)
              </p> */}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "stats"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Attendance Stats
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "reports"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            Reports
          </button>
        </div>

        {/* Stats tab */}
        {activeTab === "stats" && (
          <>
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
                              ) : m.total === 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  No attendance yet
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  {REQUIREMENT_PCT}% requirement not met
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{m.householdName} Household</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-semibold text-foreground">{m.percentage}%</span>
                            <p className="text-xs text-muted-foreground">{m.total}/{ytdMeetingCount}</p>
                          </div>
                        </div>

                        <div className="relative w-full h-2 bg-muted rounded-full overflow-visible">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${m.percentage}%` }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/30 rounded-full"
                            style={{ left: `${REQUIREMENT_PCT}%` }}
                            title={`${REQUIREMENT_PCT}% requirement`}
                          />
                        </div>

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
          </>
        )}

        {/* Reports tab */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {/* Attendance stats export */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">Attendance Stats Export</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Members with at least one attendance — filtered by the household selection on the Stats tab
                </p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Includes:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Prior count, check-in count, total attendance</li>
                    <li>Percentage and requirement status</li>
                    <li>Remaining events needed to meet requirement</li>
                  </ul>
                </div>
                <Button
                  variant="outline"
                  onClick={downloadAttendanceCSV}
                  disabled={isGeneratingStats || membersWithAttendance.length === 0}
                  className="gap-2 w-full cursor-pointer"
                >
                  {isGeneratingStats ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Attendance Stats CSV
                    </>
                  )}
                </Button>
                {membersWithAttendance.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    No members with attendance to export
                  </p>
                )}
              </div>
            </div>

            {/* Monthly report */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">Monthly Attendance Report</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Weekly prayer meeting counts per member grouped by month
                </p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Includes:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>All active members</li>
                    <li>Qualifying meeting types only - {REQUIREMENT_MEETING_TYPES.join(", ")}</li>
                    <li>Grouped by Sun–Sat week within each month</li>
                    <li>Year-to-date total per member</li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="space-y-1 w-full sm:w-auto">
                    <p className="text-xs text-muted-foreground">Report year</p>
                    <Select value={selectedReportYear} onValueChange={setSelectedReportYear}>
                      <SelectTrigger className="w-full sm:w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={downloadMonthlyCSV}
                    disabled={isGeneratingMonthly}
                    className="gap-2 w-full sm:w-auto cursor-pointer sm:mt-5"
                  >
                    {isGeneratingMonthly ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Monthly CSV
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
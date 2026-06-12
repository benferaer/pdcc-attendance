"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock, Calendar, Loader2, AlertCircle, Search, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface AttendanceFormProps {
  token: string | null
}

interface MeetingInfo {
  id: string
  title: string
  meeting_date: string
}

interface Household {
  id: string
  household_name: string
}

interface Member {
  id: string
  first_name: string
  last_name: string
  household_id: string
  household_name?: string
}

export function AttendanceForm({ token }: AttendanceFormProps) {
  const [currentDate, setCurrentDate] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submittedNames, setSubmittedNames] = useState<string[]>([])
  const [submittedHousehold, setSubmittedHousehold] = useState("")

  const [households, setHouseholds] = useState<Household[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedHouseholdId, setSelectedHouseholdId] = useState("")
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [alreadyCheckedInIds, setAlreadyCheckedInIds] = useState<string[]>([])

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      setCurrentDate(now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }))
      setCurrentTime(now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }))
    }

    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)

    const loadData = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }

      const [meetingResult, meetingHouseholdsResult] = await Promise.all([
        supabase
          .from("meetings")
          .select("id, title, meeting_date")
          .eq("id", token)
          .single(),
        supabase
          .from("meeting_households")
          .select(`
            household:households!meeting_households_household_id_fkey (
              id,
              household_name
            )
          `)
          .eq("meeting_id", token),
      ])

      if (meetingResult.error || !meetingResult.data) {
        setMeeting(null)
        setIsLoading(false)
        return
      }

      setMeeting(meetingResult.data)

      let householdList: Household[] = []
      if (!meetingHouseholdsResult.error && meetingHouseholdsResult.data) {
        householdList = meetingHouseholdsResult.data
          .map((row: any) => row.household)
          .filter(Boolean)
          .sort((a: Household, b: Household) =>
            a.household_name.localeCompare(b.household_name)
          )
        setHouseholds(householdList)

        // Auto-select if only one household — no need for user interaction
        if (householdList.length === 1) {
          setSelectedHouseholdId(householdList[0].id)
        }
      }

      // Load all active members across invited households (for search)
      const householdIds = householdList.map((h) => h.id)
      if (householdIds.length > 0) {
        const { data: membersData, error: membersError } = await supabase
          .from("members")
          .select("id, first_name, last_name, household_id")
          .in("household_id", householdIds)
          .eq("active", true)
          .order("last_name")
          .order("first_name")

        if (!membersError && membersData) {
          const householdNameMap: Record<string, string> = {}
          householdList.forEach((h) => { householdNameMap[h.id] = h.household_name })

          setAllMembers(
            membersData.map((m) => ({
              ...m,
              household_name: householdNameMap[m.household_id] ?? "",
            }))
          )
        }
      }

      // Load existing attendance for this meeting
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("member_id")
        .eq("meeting_id", token)

      setAlreadyCheckedInIds((attendanceData ?? []).map((a) => a.member_id))

      setIsLoading(false)
    }

    loadData()
    return () => clearInterval(interval)
  }, [token])

  // Determine which members to display based on household + search filters
  useEffect(() => {
    let pool = allMembers

    if (selectedHouseholdId) {
      pool = pool.filter((m) => m.household_id === selectedHouseholdId)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      pool = pool.filter((m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        `${m.last_name} ${m.first_name}`.toLowerCase().includes(q)
      )
    }

    // Exclude already checked-in members
    pool = pool.filter((m) => !alreadyCheckedInIds.includes(m.id))

    setMembers(pool)
    setIsLoadingMembers(false)
  }, [allMembers, selectedHouseholdId, searchQuery, alreadyCheckedInIds])

  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleHouseholdChange = (val: string) => {
    setSelectedHouseholdId(val === "all" ? "" : val)
    setSelectedMemberIds([])
    setError(null)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMemberIds.length === 0 || !meeting) return

    setIsSubmitting(true)
    setError(null)

    // Re-check which members are already checked in (in case of race conditions)
    const { data: existing } = await supabase
      .from("attendance")
      .select("member_id")
      .eq("meeting_id", meeting.id)
      .in("member_id", selectedMemberIds)

    const alreadyIn = (existing ?? []).map((r) => r.member_id)
    const toInsert = selectedMemberIds.filter((id) => !alreadyIn.includes(id))

    if (alreadyIn.length > 0 && toInsert.length === 0) {
      const names = alreadyIn
        .map((id) => {
          const m = allMembers.find((m) => m.id === id)
          return m ? `${m.first_name} ${m.last_name}` : ""
        })
        .filter(Boolean)
        .join(", ")
      setError(`${names} ${alreadyIn.length > 1 ? "are" : "is"} already checked in.`)
      setIsSubmitting(false)
      return
    }

    const { error: insertError } = await supabase
      .from("attendance")
      .insert(
        toInsert.map((memberId) => ({
          meeting_id: meeting.id,
          member_id: memberId,
        }))
      )

    if (insertError) {
      console.error("Error saving attendance:", insertError)
      setError("Something went wrong saving your attendance. Please try again.")
      setIsSubmitting(false)
      return
    }

    const names = toInsert
      .map((id) => {
        const m = allMembers.find((m) => m.id === id)
        return m ? `${m.first_name} ${m.last_name}` : ""
      })
      .filter(Boolean)

    const householdName = toInsert.length > 0
      ? allMembers.find((m) => m.id === toInsert[0])?.household_name ?? ""
      : ""

    if (alreadyIn.length > 0) {
      const skippedNames = alreadyIn
        .map((id) => {
          const m = allMembers.find((m) => m.id === id)
          return m ? `${m.first_name} ${m.last_name}` : ""
        })
        .filter(Boolean)
        .join(", ")
      setError(`Note: ${skippedNames} ${alreadyIn.length > 1 ? "were" : "was"} already checked in and skipped.`)
    }

    setSubmittedNames(names)
    setSubmittedHousehold(householdName)
    setAlreadyCheckedInIds((prev) => [...prev, ...toInsert])
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const handleReset = () => {
    setSelectedMemberIds([])
    setSearchQuery("")
    setSubmittedNames([])
    setSubmittedHousehold("")
    setError(null)
    setIsSubmitted(false)
    // Note: don't reset selectedHouseholdId if there's only one household —
    // it should stay locked in for the whole session
    if (households.length !== 1) {
      setSelectedHouseholdId("")
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!token || !meeting) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-destructive/50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Invalid Link</h2>
          <p className="text-muted-foreground">
            This check-in link is invalid or the event no longer exists. Please scan the current QR code at the meeting.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-primary/50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Thank You!</h2>
          <p className="text-muted-foreground mb-4">Your attendance has been recorded.</p>
          <div className="text-sm text-muted-foreground space-y-1">
            {submittedNames.map((name) => (
              <p key={name}><strong>{name}</strong></p>
            ))}
            {submittedHousehold && <p>{submittedHousehold} Household</p>}
            <p>{currentDate}</p>
          </div>
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={handleReset}>Check In Another</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary">Check In</CardTitle>
        <CardDescription>{meeting.title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-secondary rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">{currentDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">{currentTime}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Household filter */}
          <div className="space-y-2">
            <Label>Household</Label>
            {households.length === 1 ? (
              <div className="px-3 py-2 rounded-md border border-border bg-muted/30 text-sm font-medium text-foreground">
                {households[0].household_name}
              </div>
            ) : (
              <Select
                value={selectedHouseholdId || "all"}
                onValueChange={handleHouseholdChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All households" />
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
            )}
          </div>

          {/* Name search */}
          <div className="space-y-2">
            <Label>Search by name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Type a name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Who is checking in?</Label>
              {members.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMemberIds(
                      selectedMemberIds.length === members.length
                        ? []
                        : members.map((m) => m.id)
                    )
                  }
                  className="text-xs text-primary hover:underline"
                >
                  {selectedMemberIds.length === members.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {isLoadingMembers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading members...
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {searchQuery
                  ? "No matching members found."
                  : selectedHouseholdId
                  ? "All members in this household have already checked in."
                  : "No members found."}
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                {members.map((m, index) => {
                  const isSelected = selectedMemberIds.includes(m.id)
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleMemberToggle(m.id)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        isSelected ? "bg-primary/5" : "bg-card"
                      } ${index < members.length - 1 ? "border-b border-border" : ""}`}
                    >
                      <div
                        className={`w-4 h-4 shrink-0 rounded-[4px] border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-input bg-transparent"
                        }`}
                      >
                        {isSelected && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-primary-foreground">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {m.last_name}, {m.first_name}
                        </span>
                        {!selectedHouseholdId && (
                          <p className="text-xs text-muted-foreground">{m.household_name}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedMemberIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedMemberIds.length} member{selectedMemberIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            disabled={isSubmitting || selectedMemberIds.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Checking in...
              </>
            ) : selectedMemberIds.length > 1 ? (
              `Check In ${selectedMemberIds.length} Members`
            ) : (
              "Check In"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarPlus, ArrowLeft, Check, CalendarIcon, Loader2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface Household {
  id: string
  name: string
  member_count?: number
}

interface Member {
  household_id: string
}

export default function CreateEventPage() {
  const [mounted, setMounted] = useState(false)
  const [eventName, setEventName] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedHouseholds, setSelectedHouseholds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdEventName, setCreatedEventName] = useState("")
  const [households, setHouseholds] = useState<Household[]>([])
  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  useEffect(() => {
    setMounted(true)
    fetchHouseholds()
  }, [])

  const fetchHouseholds = async () => {
    setIsLoadingHouseholds(true)
    setError(null)

    const { data: householdsData, error: householdsError } = await supabase
      .from("households")
      .select("id, household_name")
      .order("household_name")

    if (householdsError) {
      console.error("Error fetching households:", householdsError)
      setError("Failed to load households")
      setIsLoadingHouseholds(false)
      return
    }

    const { data: membersData, error: membersError } = await supabase
      .from("members")
      .select("household_id")
      .eq("active", true)

    if (membersError) {
      console.error("Error fetching members:", membersError)
    }

    const memberCounts: Record<string, number> = {}
    if (membersData) {
      membersData.forEach((member: Member) => {
        memberCounts[member.household_id] = (memberCounts[member.household_id] || 0) + 1
      })
    }

    const householdsWithCounts = (householdsData || []).map((h: any) => ({
      id: h.id,
      name: h.household_name,
      member_count: memberCounts[h.id] || 0,
    }))

    setHouseholds(householdsWithCounts)
    setIsLoadingHouseholds(false)
  }

  const handleHouseholdToggle = (householdId: string) => {
    setSelectedHouseholds((prev) =>
      prev.includes(householdId)
        ? prev.filter((id) => id !== householdId)
        : [...prev, householdId]
    )
  }

  const handleSelectAll = () => {
    if (selectedHouseholds.length === households.length) {
      setSelectedHouseholds([])
    } else {
      setSelectedHouseholds(households.map((h) => h.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!eventName || selectedHouseholds.length === 0 || !selectedDate) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    const formattedDate = format(selectedDate, "yyyy-MM-dd")

    const { data: meeting, error: meetingError } = await supabase
  .from("meetings")
  .insert({
    title: eventName,
    meeting_date: formattedDate,
  })
  .select("id")
  .single()

if (meetingError) {
  console.error("Error creating meeting:", meetingError)
  setError("Failed to create event. Please try again.")
  setIsSubmitting(false)
  return
}

    // Link selected households to the meeting
    const { error: householdLinkError } = await supabase
      .from("meeting_households")
      .insert(
        selectedHouseholds.map((householdId) => ({
          meeting_id: meeting.id,
          household_id: householdId,
        }))
      )

    if (householdLinkError) {
      console.error("Error linking households:", householdLinkError)
      setError("Event created but failed to link households. Please try again.")
      setIsSubmitting(false)
      return
    }

    setCreatedEventName(eventName)
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  const handleReset = () => {
    setEventName("")
    setSelectedHouseholds([])
    setSelectedDate(new Date())
    setIsSuccess(false)
    setCreatedEventName("")
    setError(null)
  }

  const getTotalMembers = () => {
    return selectedHouseholds.reduce((total, id) => {
      const household = households.find((h) => h.id === id)
      return total + (household?.member_count || 0)
    }, 0)
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-muted rounded w-48"></div>
            <div className="h-96 bg-muted rounded max-w-lg mx-auto"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
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
              <h1 className="text-2xl font-bold text-primary">Create Event</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Schedule a new prayer group event
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {isSuccess ? (
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Event Created!</h2>
                    <p className="text-muted-foreground mt-1">
                      {createdEventName} has been scheduled
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedHouseholds.length} household
                      {selectedHouseholds.length !== 1 ? "s" : ""} invited (
                      {getTotalMembers()} members expected)
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center pt-4">
                    <Button onClick={handleReset} variant="outline">
                      Create Another
                    </Button>
                    <Link href="/">
                      <Button>Back to Home</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CalendarPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Event Details</CardTitle>
                    <CardDescription>
                      Fill in the information below to create a new event
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="eventName">Event Name</Label>
                    <Input
                      id="eventName"
                      type="text"
                      placeholder="e.g., Weekly Prayer Meeting"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? (
                            format(selectedDate, "EEEE, MMMM d, yyyy")
                          ) : (
                            <span>Select a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Select today or a future date for the event
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Households</Label>
                      {households.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                          className="text-xs h-7"
                        >
                          {selectedHouseholds.length === households.length
                            ? "Deselect All"
                            : "Select All"}
                        </Button>
                      )}
                    </div>
                    <div className="border border-border rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto">
                      {isLoadingHouseholds ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Loading households...
                        </div>
                      ) : households.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No households found. Add households in Supabase first.
                        </div>
                      ) : (
                        households.map((household) => (
                          <div
                            key={household.id}
                            className="flex items-center space-x-3 p-2 rounded hover:bg-secondary/50 transition-colors"
                          >
                            <Checkbox
                              id={`household-${household.id}`}
                              checked={selectedHouseholds.includes(household.id)}
                              onCheckedChange={() => handleHouseholdToggle(household.id)}
                            />
                            <label
                              htmlFor={`household-${household.id}`}
                              className="flex-1 cursor-pointer text-sm"
                            >
                              <span className="font-medium">{household.name}</span>
                              <span className="text-muted-foreground ml-2">
                                ({household.member_count} member
                                {household.member_count !== 1 ? "s" : ""})
                              </span>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedHouseholds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedHouseholds.length} household
                        {selectedHouseholds.length !== 1 ? "s" : ""} selected (
                        {getTotalMembers()} members expected)
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isSubmitting ||
                      !eventName ||
                      selectedHouseholds.length === 0 ||
                      !selectedDate ||
                      isLoadingHouseholds
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Event"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
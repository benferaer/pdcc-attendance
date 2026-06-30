"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Check, Loader2, Pencil, Trash2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

const EVENT_TYPES = [
  { value: "Prayer Meeting", label: "Prayer Meeting" },
  { value: "Cluster Meeting", label: "Cluster Meeting" },
  { value: "Household Meeting", label: "Household Meeting" },
  { value: "Eucharistic Assembly", label: "Eucharistic Assembly" },
  { value: "General Assembly", label: "General Assembly" },
  { value: "Others", label: "Others" },
]

interface MeetingInfo {
  id: string
  title: string
  meeting_date: string
  meeting_type: string
  custom_event_type: string | null
}

interface Household {
  id: string
  household_name: string
}

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null)
  const [households, setHouseholds] = useState<Household[]>([])
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [eventType, setEventType] = useState("")
  const [customEventType, setCustomEventType] = useState("")

  useEffect(() => {
    const loadData = async () => {
      const [meetingResult, attendanceResult, householdsResult] = await Promise.all([
        supabase
          .from("meetings")
          .select("id, title, meeting_date, meeting_type, custom_event_type")
          .eq("id", id)
          .single(),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("meeting_id", id),
        supabase
          .from("meeting_households")
          .select(`
            household:households!meeting_households_household_id_fkey (
              id,
              household_name
            )
          `)
          .eq("meeting_id", id),
      ])

      if (meetingResult.error || !meetingResult.data) {
        console.error("Error loading meeting:", meetingResult.error)
        setIsLoading(false)
        return
      }

      const m = meetingResult.data
      setMeeting(m)
      setTitle(m.title ?? "")
      setSelectedDate(parseISO(m.meeting_date))
      setEventType(m.meeting_type ?? "")
      setCustomEventType(m.custom_event_type ?? "")
      setAttendanceCount(attendanceResult.count ?? 0)

      if (!householdsResult.error && householdsResult.data) {
        setHouseholds(
          householdsResult.data
            .map((row: any) => row.household)
            .filter(Boolean)
            .sort((a: Household, b: Household) =>
              a.household_name.localeCompare(b.household_name)
            )
        )
      }

      setIsLoading(false)
    }

    loadData()
  }, [id])

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !selectedDate || !eventType) {
      setError("Title, date, and event type are required.")
      return
    }

    if (eventType === "Others" && !customEventType.trim()) {
      setError("Please describe the event type.")
      return
    }

    setIsSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from("meetings")
      .update({
        title: title.trim(),
        meeting_date: format(selectedDate, "yyyy-MM-dd"),
        meeting_type: eventType,
        custom_event_type: eventType === "Others" ? customEventType.trim() : null,
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating meeting:", updateError)
      setError("Failed to save changes. Please try again.")
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 3000)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    // Delete meeting_households first (FK constraint)
    const { error: mhError } = await supabase
      .from("meeting_households")
      .delete()
      .eq("meeting_id", id)

    if (mhError) {
      console.error("Error deleting meeting households:", mhError)
      setError("Failed to delete event. Please try again.")
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    const { error: deleteError } = await supabase
      .from("meetings")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting meeting:", deleteError)
      setError("Failed to delete event. Please try again.")
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    router.push("/")
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

  const canDelete = attendanceCount === 0

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 cursor-pointer"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-primary">Edit Event</h1>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {meeting.title}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
        {/* Edit form */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Event Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Households cannot be changed after creation
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="px-5 py-6 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {isSuccess && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                Changes saved successfully.
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Event Name</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly Prayer Meeting"
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
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
                    {selectedDate
                      ? format(selectedDate, "EEEE, MMMM d, yyyy")
                      : "Select a date"}
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
            </div>

            {/* Event Type */}
            <div className="space-y-1.5">
              <Label>Event Type</Label>
              <Select
                value={eventType}
                onValueChange={(val) => {
                  setEventType(val)
                  if (val !== "Others") setCustomEventType("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eventType === "Others" && (
                <Input
                  placeholder="Describe the event type..."
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Invited households — read only */}
            {households.length > 0 && (
              <div className="space-y-1.5">
                <Label>Invited Households</Label>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {households.map((h) => (
                    <div key={h.id} className="px-3 py-2 text-sm text-muted-foreground">
                      {h.household_name}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Households cannot be changed after creation.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Delete section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs text-muted-foreground mt-0.5">
              {canDelete
                ? "This event has no check-ins and can be deleted."
                : `This event has ${attendanceCount} check-in${attendanceCount > 1 ? "s" : ""} and cannot be deleted.`}
            </p>
          </div>
          <div className="px-5 py-4">
            {!canDelete ? (
              <Button
                variant="outline"
                disabled
                className="gap-2 w-full opacity-50 cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete Event
              </Button>
            ) : showDeleteConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive font-medium">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      "Yes, delete event"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2 w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete Event
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
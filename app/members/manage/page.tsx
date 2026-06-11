"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, X, Pencil, Check, Loader2, Users, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface Member {
  id: string
  firstName: string
  lastName: string
  active: boolean
  householdId: string | null
  householdName: string
}

interface Household {
  id: string
  household_name: string
}

interface EditState {
  firstName: string
  lastName: string
  active: boolean
  householdId: string
}

export default function ManageMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [householdFilter, setHouseholdFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const loadData = async () => {
    const [membersResult, householdsResult] = await Promise.all([
      supabase
        .from("members")
        .select(`
          id,
          first_name,
          last_name,
          active,
          household_id,
          household:households!members_household_id_fkey (
            id,
            household_name
          )
        `)
        .order("last_name")
        .order("first_name"),
      supabase
        .from("households")
        .select("id, household_name")
        .order("household_name"),
    ])

    if (!membersResult.error && membersResult.data) {
      setMembers(
        membersResult.data.map((m: any) => ({
          id: m.id,
          firstName: m.first_name,
          lastName: m.last_name,
          active: m.active,
          householdId: m.household_id,
          householdName: m.household?.household_name ?? "—",
        }))
      )
    }

    if (!householdsResult.error && householdsResult.data) {
      setHouseholds(householdsResult.data)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const fullName = `${m.firstName} ${m.lastName} ${m.lastName} ${m.firstName}`.toLowerCase()
      const matchesSearch = searchQuery === "" || fullName.includes(searchQuery.toLowerCase())
      const matchesHousehold = householdFilter === "all" || m.householdId === householdFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && m.active) ||
        (statusFilter === "inactive" && !m.active)
      return matchesSearch && matchesHousehold && matchesStatus
    })
  }, [members, searchQuery, householdFilter, statusFilter])

  const startEdit = (m: Member) => {
    setEditingId(m.id)
    setSaveError(null)
    setSaveSuccess(null)
    setEditState({
      firstName: m.firstName,
      lastName: m.lastName,
      active: m.active,
      householdId: m.householdId ?? "",
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditState(null)
    setSaveError(null)
  }

  const saveEdit = async (memberId: string) => {
    if (!editState) return
    if (!editState.firstName.trim() || !editState.lastName.trim()) {
      setSaveError("First and last name are required.")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    const { error } = await supabase
      .from("members")
      .update({
        first_name: editState.firstName.trim(),
        last_name: editState.lastName.trim(),
        active: editState.active,
        household_id: editState.householdId || null,
      })
      .eq("id", memberId)

    if (error) {
      console.error("Error updating member:", error)
      setSaveError("Failed to save changes. Please try again.")
      setIsSaving(false)
      return
    }

    await loadData()
    setIsSaving(false)
    setEditingId(null)
    setEditState(null)
    setSaveSuccess(memberId)
    setTimeout(() => setSaveSuccess(null), 3000)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setHouseholdFilter("all")
    setStatusFilter("all")
  }

  const hasFilters = searchQuery || householdFilter !== "all" || statusFilter !== "all"

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-48"></div>
            <div className="h-96 bg-muted rounded"></div>
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
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Manage Members</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {members.filter((m) => m.active).length} active · {members.filter((m) => !m.active).length} inactive
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-5">
        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <Select value={householdFilter} onValueChange={setHouseholdFilter}>
              <SelectTrigger className="flex-1">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 shrink-0">
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>
          {hasFilters && (
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {members.length} members
            </p>
          )}
        </div>

        {/* Members list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No members match your filters</p>
              {hasFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-1 text-xs">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((m) => {
                const isEditing = editingId === m.id
                const justSaved = saveSuccess === m.id

                return (
                  <li key={m.id} className={`px-5 py-4 transition-colors ${isEditing ? "bg-muted/30" : ""}`}>
                    {isEditing && editState ? (
                      /* Edit mode */
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor={`first-${m.id}`} className="text-xs">First name</Label>
                            <Input
                              id={`first-${m.id}`}
                              value={editState.firstName}
                              onChange={(e) => setEditState({ ...editState, firstName: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`last-${m.id}`} className="text-xs">Last name</Label>
                            <Input
                              id={`last-${m.id}`}
                              value={editState.lastName}
                              onChange={(e) => setEditState({ ...editState, lastName: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Household</Label>
                          <Select
                            value={editState.householdId}
                            onValueChange={(val) => setEditState({ ...editState, householdId: val })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select household" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No household</SelectItem>
                              {households.map((h) => (
                                <SelectItem key={h.id} value={h.id}>
                                  {h.household_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Status</Label>
                          <Select
                            value={editState.active ? "active" : "inactive"}
                            onValueChange={(val) =>
                              setEditState({ ...editState, active: val === "active" })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {saveError && (
                          <p className="text-xs text-destructive">{saveError}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(m.id)}
                            disabled={isSaving}
                            className="gap-1.5 h-8 cursor-pointer"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            disabled={isSaving}
                            className="h-8 cursor-pointer"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {m.lastName}, {m.firstName}
                            </span>
                            {justSaved && (
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Saved
                              </span>
                            )}
                            <Badge
                              variant={m.active ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {m.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.householdName} Household
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(m)}
                          className="gap-1.5 shrink-0 h-8 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </div>
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
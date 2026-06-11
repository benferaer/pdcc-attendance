"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Check, Loader2, UserPlus } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface Household {
  id: string
  household_name: string
}

export default function NewMemberPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [householdId, setHouseholdId] = useState("none")
  const [households, setHouseholds] = useState<Household[]>([])
  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdName, setCreatedName] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadHouseholds = async () => {
      const { data, error } = await supabase
        .from("households")
        .select("id, household_name")
        .order("household_name")

      if (!error && data) setHouseholds(data)
      setIsLoadingHouseholds(false)
    }

    loadHouseholds()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase
      .from("members")
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        household_id: householdId === "none" ? null : householdId,
        active: true,
      })

    if (insertError) {
      console.error("Error creating member:", insertError)
      setError("Failed to create member. Please try again.")
      setIsSubmitting(false)
      return
    }

    setCreatedName(`${firstName.trim()} ${lastName.trim()}`)
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  const handleReset = () => {
    setFirstName("")
    setLastName("")
    setHouseholdId("none")
    setIsSuccess(false)
    setCreatedName("")
    setError(null)
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/members/manage">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary">New Member</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Add a new member to the community
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-lg">
        {isSuccess ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Member Created!</h2>
              <p className="text-muted-foreground mt-1">
                {createdName} has been added as an active member.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={handleReset} variant="outline">
                Add Another
              </Button>
              <Link href="/members/manage">
                <Button>Back to Members</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Member Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  New members are set to active by default
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">
                    First name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">
                    Last name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="e.g. Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="household">Household</Label>
                {isLoadingHouseholds ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading households...
                  </div>
                ) : (
                  <Select value={householdId} onValueChange={setHouseholdId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a household" />
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
                )}
                <p className="text-xs text-muted-foreground">
                  Optional — can be assigned later via manage members
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Member
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
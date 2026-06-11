import { supabase } from "@/lib/supabase"

export interface HouseholdMember {
  id: string
  first_name: string
  last_name: string
  household_id: string | null
}

export interface Household {
  id: string
  household_name: string
}

// event placeholders

export interface PrayerEvent {
  id: string
  name: string
  date: string
  createdAt: number
}

export interface EventAttendance {
  id: string
  eventId: string
  memberId: string
  memberName: string
  householdId: string
  householdName: string
  timestamp: number
}

// API functions to fetch households from Supabase
export async function getHouseholds(): Promise<Household[]> {
  const { data, error } = await supabase
    .from("households")
    .select("*")

  if (error) throw error
  return data ?? []
}


// API function to fetch a member by ID from Supabase
export async function getMembers(): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")

  if (error) throw error
  return data ?? []
}

// API function to fetch members by household ID from Supabase
export async function getMembersByHouseholdId(householdId: string) {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("household_id", householdId)

  if (error) throw error
  return data ?? []
}

// HELPER FUNCTIONS - these can be used in components to get household/member info without directly querying Supabase each time
export async function getHouseholdById(id: string) {
  const { data } = await supabase
    .from("households")
    .select("*")
    .eq("id", id)
    .single()

  return data ?? null
}

export async function getHouseholdByName(name: string) {
  const { data } = await supabase
    .from("households")
    .select("*")
    .eq("household_name", name)
    .single()

  return data ?? null
}

export async function getMemberById(id: string) {
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single()

  return data ?? null
}

export async function getExpectedAttendees(householdIds: string[]) {
  const { count, error } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true })
    .in("household_id", householdIds)

  if (error) return 0
  return count ?? 0
}
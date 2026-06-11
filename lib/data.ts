// Placeholder data - will be replaced with Supabase data

export interface HouseholdMember {
  id: string
  firstName: string
  lastName: string
}

export interface Household {
  id: string
  name: string
  members: HouseholdMember[]
}

export interface PrayerEvent {
  id: string
  name: string
  date: string
  householdIds: string[]
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

// Placeholder households with members - will be replaced with Supabase data
export const PLACEHOLDER_HOUSEHOLDS: Household[] = [
  {
    id: "1",
    name: "Smith",
    members: [
      { id: "1-1", firstName: "John", lastName: "Smith" },
      { id: "1-2", firstName: "Mary", lastName: "Smith" },
      { id: "1-3", firstName: "James", lastName: "Smith" },
    ],
  },
  {
    id: "2",
    name: "Johnson",
    members: [
      { id: "2-1", firstName: "Robert", lastName: "Johnson" },
      { id: "2-2", firstName: "Linda", lastName: "Johnson" },
      { id: "2-3", firstName: "Michael", lastName: "Johnson" },
      { id: "2-4", firstName: "Sarah", lastName: "Johnson" },
    ],
  },
  {
    id: "3",
    name: "Williams",
    members: [
      { id: "3-1", firstName: "David", lastName: "Williams" },
      { id: "3-2", firstName: "Jennifer", lastName: "Williams" },
    ],
  },
  {
    id: "4",
    name: "Brown",
    members: [
      { id: "4-1", firstName: "Richard", lastName: "Brown" },
      { id: "4-2", firstName: "Patricia", lastName: "Brown" },
      { id: "4-3", firstName: "Thomas", lastName: "Brown" },
      { id: "4-4", firstName: "Elizabeth", lastName: "Brown" },
      { id: "4-5", firstName: "Christopher", lastName: "Brown" },
    ],
  },
  {
    id: "5",
    name: "Garcia",
    members: [
      { id: "5-1", firstName: "Carlos", lastName: "Garcia" },
      { id: "5-2", firstName: "Maria", lastName: "Garcia" },
      { id: "5-3", firstName: "Sofia", lastName: "Garcia" },
    ],
  },
  {
    id: "6",
    name: "Martinez",
    members: [
      { id: "6-1", firstName: "Jose", lastName: "Martinez" },
      { id: "6-2", firstName: "Ana", lastName: "Martinez" },
    ],
  },
  {
    id: "7",
    name: "Davis",
    members: [
      { id: "7-1", firstName: "William", lastName: "Davis" },
      { id: "7-2", firstName: "Barbara", lastName: "Davis" },
      { id: "7-3", firstName: "Joseph", lastName: "Davis" },
      { id: "7-4", firstName: "Susan", lastName: "Davis" },
    ],
  },
  {
    id: "8",
    name: "Rodriguez",
    members: [
      { id: "8-1", firstName: "Miguel", lastName: "Rodriguez" },
      { id: "8-2", firstName: "Carmen", lastName: "Rodriguez" },
      { id: "8-3", firstName: "Diego", lastName: "Rodriguez" },
    ],
  },
]

// Helper functions
export function getHouseholdById(id: string): Household | undefined {
  return PLACEHOLDER_HOUSEHOLDS.find((h) => h.id === id)
}

export function getHouseholdByName(name: string): Household | undefined {
  return PLACEHOLDER_HOUSEHOLDS.find((h) => h.name === name)
}

export function getMemberById(memberId: string): HouseholdMember | undefined {
  for (const household of PLACEHOLDER_HOUSEHOLDS) {
    const member = household.members.find((m) => m.id === memberId)
    if (member) return member
  }
  return undefined
}

export function getExpectedAttendees(householdIds?: string[]): number {
  return (householdIds || []).reduce((total, id) => {
    const household = getHouseholdById(id)
    return total + (household?.members.length || 0)
  }, 0)
}
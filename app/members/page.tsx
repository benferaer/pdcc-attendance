import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3, Settings, UserPlus, ChevronRight } from "lucide-react"
import Link from "next/link"

const SECTIONS = [
  {
    href: "/members/stats",
    icon: BarChart3,
    title: "Attendance Stats",
    description: "Check 35% requirement progress",
  },
  {
    href: "/members/manage",
    icon: Settings,
    title: "Manage Members",
    description: "Edit details, households, status",
  },
  {
    href: "/members/manage/new",
    icon: UserPlus,
    title: "Add Member",
    description: "Create a new member record",
  },
]

export default function MembersHubPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="md:hidden">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary">Members</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Attendance tracking and member management
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-lg space-y-3">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
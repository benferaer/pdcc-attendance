import { AttendanceForm } from "@/components/attendance-form"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

function AttendanceContent({ id }: { id: string }) {
  return (
    <main className="min-h-screen bg-background flex flex-col">
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
            <div>
              <h1 className="text-2xl font-bold text-primary">Check-In</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Register attendance for this event
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <AttendanceForm token={id} />
      </div>
    </main>
  )
}

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AttendanceContent id={id} />
}
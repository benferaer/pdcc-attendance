import { AttendanceForm } from "@/components/attendance-form"

function AttendanceContent({ id }: { id: string }) {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <img src="/PDCC-logo.png" alt="Prayer Group Logo" className="h-22 w-22" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <AttendanceForm token={id} />
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Thank you for joining us in prayer</p>
        </div>
      </footer>
    </main>
  )
}

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AttendanceContent id={id} />
}
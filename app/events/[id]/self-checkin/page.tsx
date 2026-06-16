import { SelfCheckinForm } from "@/components/self-checkin-form"

function SelfCheckinContent({ id }: { id: string }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <SelfCheckinForm token={id} />
    </main>
  )
}

export default async function SelfCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SelfCheckinContent id={id} />
}
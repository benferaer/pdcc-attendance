"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, CalendarPlus, Calendar } from "lucide-react"
import Link from "next/link"

export function EventsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        <Calendar className="w-4 h-4" />
        Events
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-52 bg-card border border-border rounded-md shadow-md p-1 z-50">
          <Link href="/events/history" onClick={() => setOpen(false)}>
            <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              View all events
            </div>
          </Link>
          <Link href="/events/create" onClick={() => setOpen(false)}>
            <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors">
              <CalendarPlus className="w-4 h-4 text-muted-foreground" />
              Create event
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
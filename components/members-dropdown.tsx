"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Users, ChevronDown, BarChart3, Settings, UserPlus } from "lucide-react"
import Link from "next/link"

export function MembersDropdown() {
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
        <Users className="w-4 h-4" />
        Members
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-52 bg-card border border-border rounded-md shadow-md p-1 z-50">
          <Link href="/members/stats" onClick={() => setOpen(false)}>
            <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Attendance stats
            </div>
          </Link>
          <Link href="/members/manage" onClick={() => setOpen(false)}>
            <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors">
              <Settings className="w-4 h-4 text-muted-foreground" />
              Manage members
            </div>
          </Link>
          <Link href="/members/manage/new" onClick={() => setOpen(false)}>
            <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              Add member
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
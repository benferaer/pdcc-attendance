"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, Users } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/events/history", label: "Events", icon: Calendar },
    { href: "/members", label: "Members", icon: Users },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 px-4 py-1">
              <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-xs ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
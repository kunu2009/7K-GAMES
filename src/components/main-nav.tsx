"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, ImageIcon, Sparkles } from "lucide-react"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

const links = [
  { href: "/", label: "Games", icon: Gamepad2 },
  { href: "/rules-generator", label: "AI Rule Generator", icon: Sparkles },
  { href: "/image-generator", label: "AI Image Generator", icon: ImageIcon },
]

export default function MainNav() {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === link.href}
            tooltip={{ children: link.label }}
          >
            <Link href={link.href}>
              <link.icon />
              <span>{link.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, LayoutDashboard, PanelLeft, PanelLeftClose, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logout } from "@/components/admin/logout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sidebar as SidebarPanel, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/books", label: "Kelola Buku", icon: BookOpen },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onMobileClose: () => void
  userName: string
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose, userName }: SidebarProps) {
  const pathname = usePathname()
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "A"
  return <SidebarProvider defaultOpen={!collapsed} className="contents">
    <SidebarPanel collapsible="none" className={cn("admin-panel h-dvh min-h-0 border-r border-sidebar-border", collapsed ? "w-[4.5rem]" : "w-64")}>
      <SidebarHeader className={cn("h-16 shrink-0 flex-row items-center border-b border-border px-4", collapsed ? "justify-center" : "justify-between")}>
        <Button variant="ghost" nativeButton={false} render={<Link href="/admin" onClick={onMobileClose}/>} aria-label="Pikso, dashboard" className="h-auto min-w-0 justify-start gap-3 p-0 hover:bg-transparent">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted font-heading text-xl font-extrabold tracking-tight text-primary">p<span aria-hidden="true" className="text-sm">✿</span></span>
          {!collapsed && <span className="flex min-w-0 flex-col items-start"><span className="truncate text-sm font-semibold tracking-tight">Pikso Studio</span><span className="text-[10px] leading-none text-muted-foreground">Panel pengelola</span></span>}
        </Button>
        {mobileOpen && <Button type="button" variant="ghost" size="icon" onClick={onMobileClose} aria-label="Tutup menu navigasi" className="shrink-0 text-primary"><X className="size-5"/></Button>}
      </SidebarHeader>
      <SidebarContent className="px-3 py-3">
        <nav aria-label="Navigasi admin">
          {!collapsed && <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Menu</div>}
          <SidebarMenu className="gap-0.5">{navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href)
            return <SidebarMenuItem key={href}><SidebarMenuButton render={<Link href={href} onClick={onMobileClose}/>} aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} isActive={active} className={cn("min-h-11 rounded-xl font-medium", collapsed ? "mx-auto w-10 justify-center px-0" : "gap-3 px-3", active ? "shadow-sm" : "text-muted-foreground")}><Icon aria-hidden="true"/>{!collapsed && <span>{label}</span>}</SidebarMenuButton></SidebarMenuItem>
          })}</SidebarMenu>
        </nav>
      </SidebarContent>
      <SidebarFooter className={cn("shrink-0 border-t border-border", collapsed ? "items-center p-3" : "p-4")}>
        <div className={cn("flex min-w-0 items-center gap-3", collapsed && "flex-col gap-2")}>
          <Avatar title={userName} aria-label={userName} className="size-9 shrink-0 rounded-xl"><AvatarFallback className="rounded-xl bg-muted text-sm font-semibold text-primary">{initials}</AvatarFallback></Avatar>
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{userName}</p><p className="truncate text-[11px] text-muted-foreground">Administrator</p></div>}
          <Logout/>
        </div>
      </SidebarFooter>
    </SidebarPanel>
  </SidebarProvider>
}

export function SidebarCollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const Icon = collapsed ? PanelLeft : PanelLeftClose
  return <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"} title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"} className="hidden size-9 text-muted-foreground lg:inline-flex"><Icon className="size-4"/></Button>
}

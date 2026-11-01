"use client"

import { Fragment, type RefObject } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home, Menu } from "lucide-react"
import { SidebarCollapseButton } from "@/components/admin/Sidebar"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

const pathLabels: Record<string, string> = {
  "": "Dashboard",
  "books": "Kelola Buku",
  "new": "Tambah Cerita",
  "preview": "Pratinjau Buku",
}

export function AdminHeader({ menuButtonRef, collapsed, mobileOpen, onToggleCollapse, onToggleMobile }: {
  menuButtonRef: RefObject<HTMLButtonElement | null>
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onToggleMobile: () => void
}) {
  const pathname = usePathname()
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean)
  const crumbs = [{ label: "Beranda", href: "/admin" }]
  let currentPath = "/admin"
  for (const segment of segments) {
    currentPath += `/${segment}`
    crumbs.push({ label: pathLabels[segment] ?? "Edit Buku", href: currentPath })
  }
  if (crumbs.length === 1) crumbs.push({ label: "Dashboard", href: "/admin" })
  return <header className="admin-panel sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 lg:px-6">
    <div className="flex min-w-0 items-center gap-2">
      <Button ref={menuButtonRef} type="button" variant="ghost" size="icon" onClick={onToggleMobile} aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"} aria-expanded={mobileOpen} aria-controls="admin-sidebar-drawer" className="shrink-0 text-muted-foreground lg:hidden"><Menu className="size-5"/></Button>
      <SidebarCollapseButton collapsed={collapsed} onClick={onToggleCollapse}/>
      <Breadcrumb aria-label="Jejak navigasi" className="min-w-0 overflow-hidden text-xs sm:text-sm"><BreadcrumbList className="flex-nowrap gap-1.5 overflow-hidden">
        {crumbs.map((crumb,index) => <Fragment key={`${crumb.href}-${index}`}>
          {index>0&&<BreadcrumbSeparator><ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground/40"/></BreadcrumbSeparator>}
          <BreadcrumbItem className="min-w-0 shrink-0 gap-1.5">{index < crumbs.length-1 ? <BreadcrumbLink render={<Link href={crumb.href}/>} aria-label={crumb.label} className="flex items-center gap-1 whitespace-nowrap">{index===0&&<Home aria-hidden="true" className="size-3.5"/>}<span className="hidden sm:inline">{crumb.label}</span></BreadcrumbLink> : <BreadcrumbPage className="max-w-[45vw] truncate font-medium sm:max-w-[55vw]">{crumb.label}</BreadcrumbPage>}</BreadcrumbItem>
        </Fragment>)}
      </BreadcrumbList></Breadcrumb>
    </div>
    <span className="ml-3 hidden shrink-0 text-[11px] text-muted-foreground sm:block">Pikso Studio</span>
  </header>
}

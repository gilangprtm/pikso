"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/admin/Sidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"

export function AdminWorkspace({ children, userName }: { children: React.ReactNode; userName: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)")
    const onResize = () => { if (wide.matches) setMobileOpen(false) }
    wide.addEventListener("change", onResize)
    return () => wide.removeEventListener("change", onResize)
  }, [])
  // Sheet owns focus trapping, Escape dismissal, body locking and focus restoration.
  return <div className="school-admin h-dvh min-h-0 overflow-hidden bg-background text-foreground">
    <Toaster position="top-right" richColors/>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent id="admin-sidebar-drawer" side="left" finalFocus={menuButtonRef} showCloseButton={false} className="school-admin w-64! gap-0 bg-sidebar p-0 lg:hidden">
        <SheetTitle className="sr-only">Menu admin</SheetTitle><SheetDescription className="sr-only">Navigasi panel pengelola Pikso Studio.</SheetDescription>
        <Sidebar key={pathname} collapsed={false} mobileOpen={true} userName={userName} onMobileClose={() => setMobileOpen(false)}/>
      </SheetContent>
    </Sheet>
    <div className="fixed left-0 top-0 z-40 hidden h-dvh lg:block"><Sidebar collapsed={collapsed} mobileOpen={false} userName={userName} onMobileClose={() => setMobileOpen(false)}/></div>
    <div className="flex h-dvh min-h-0 flex-col transition-[margin] duration-300 ease-in-out lg:ml-[var(--admin-sidebar-width)]" style={{ "--admin-sidebar-width": collapsed ? "4.5rem" : "16rem" } as React.CSSProperties}>
      <AdminHeader menuButtonRef={menuButtonRef} collapsed={collapsed} mobileOpen={mobileOpen} onToggleCollapse={() => setCollapsed(value => !value)} onToggleMobile={() => setMobileOpen(value => !value)}/>
      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6 lg:p-8">{children}</main>
    </div>
  </div>
}

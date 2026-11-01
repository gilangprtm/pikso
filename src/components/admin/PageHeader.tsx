"use client"

import { Fragment } from "react"
import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

export interface AdminBreadcrumb { label: string; href: string }
export function PageHeader({ title, breadcrumbs = [], actionLabel, actionHref }: {
  title: string
  breadcrumbs?: AdminBreadcrumb[]
  actionLabel?: string
  actionHref?: string
}) {
  return <div className="mb-6 min-w-0">
    {breadcrumbs.length > 0 && <Breadcrumb aria-label="Jejak navigasi halaman" className="mb-2 min-w-0 overflow-hidden text-xs"><BreadcrumbList className="flex-nowrap gap-1.5 overflow-hidden">
      {breadcrumbs.map((crumb,index) => <Fragment key={`${crumb.href}-${index}`}>
        {index>0&&<BreadcrumbSeparator><ChevronRight className="size-3.5 opacity-40"/></BreadcrumbSeparator>}
        <BreadcrumbItem className="min-w-0 shrink-0 gap-1.5">{index < breadcrumbs.length - 1 ? <BreadcrumbLink render={<Link href={crumb.href}/>} className="max-w-[35vw] truncate">{crumb.label}</BreadcrumbLink> : <BreadcrumbPage className="max-w-[45vw] truncate font-medium">{crumb.label}</BreadcrumbPage>}</BreadcrumbItem>
      </Fragment>)}
    </BreadcrumbList></Breadcrumb>}
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {actionLabel && actionHref && <Button nativeButton={false} render={<Link href={actionHref}/>} className="min-h-11 shrink-0"><Plus aria-hidden="true" className="size-4"/>{actionLabel}</Button>}
    </div>
  </div>
}

import Link from "next/link"
import { type LucideIcon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}
export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return <Empty className="rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16"><EmptyHeader><EmptyMedia variant="icon" className="size-16 rounded-2xl [&_svg]:size-8"><Icon/></EmptyMedia><EmptyTitle className="text-lg font-bold">{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{actionLabel&&actionHref&&<EmptyContent><Button nativeButton={false} render={<Link href={actionHref}/>} className="min-h-11"><Plus className="size-4"/>{actionLabel}</Button></EmptyContent>}</Empty>
}

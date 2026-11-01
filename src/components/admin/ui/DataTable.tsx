"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/components/ui/pagination"

export interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}
interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
  pageSize?: number
  serverSorting?: { key: string; direction: "asc" | "desc"; onSort: (key: string) => void }
  rowKey?: (item: T) => string
}
export function DataTable<T>({ columns, data, onRowClick, emptyMessage = "Tidak ada data", pageSize = 10, serverSorting, rowKey }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const activeSortKey = serverSorting?.key ?? sortKey
  const activeSortDir = serverSorting?.direction ?? sortDir
  function handleSort(key: string) {
    if (serverSorting) { serverSorting.onSort(key); return }
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }
  const sorted = !serverSorting && sortKey ? [...data].sort((a,b) => {
    const av = String((a as Record<string,unknown>)[sortKey] ?? "")
    const bv = String((b as Record<string,unknown>)[sortKey] ?? "")
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
  }) : data
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
  const pageNumbers = Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=1).reduce<(number|"...")[]>((acc,p,i,arr)=>{
    if(i>0&&p-arr[i-1]>1)acc.push("...")
    acc.push(p);return acc
  },[])
  if (!data.length) return <Empty className="rounded-2xl border border-border bg-card py-16"><EmptyDescription>{emptyMessage}</EmptyDescription></Empty>
  return <Card className="gap-0 overflow-hidden rounded-2xl p-0">
    <Table>
      <TableHeader><TableRow className="bg-muted/30">{columns.map(col=><TableHead key={col.key} aria-sort={col.sortable ? activeSortKey===col.key ? activeSortDir==="asc"?"ascending":"descending" : "none" : undefined} className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {col.sortable ? <Button type="button" variant="ghost" size="sm" onClick={()=>handleSort(col.key)} className="-ml-2 h-10 gap-1.5 text-xs font-semibold uppercase tracking-wider">{col.label}{activeSortKey===col.key ? activeSortDir==="asc"?<ChevronUp className="size-3"/>:<ChevronDown className="size-3"/> : <ChevronsUpDown className="size-3"/>}</Button> : col.label}
      </TableHead>)}</TableRow></TableHeader>
      <TableBody>{paginated.map((item,i)=><TableRow key={rowKey ? rowKey(item) : i} className={onRowClick?"cursor-pointer":""} onClick={()=>onRowClick?.(item)}>{columns.map(col=><TableCell key={col.key} className="px-4 py-3.5 text-foreground/80">{col.render?col.render(item):String((item as Record<string,unknown>)[col.key]??"")}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
    {totalPages>1&&<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"><p className="text-xs text-muted-foreground">Menampilkan {(safePage-1)*pageSize+1}–{Math.min(safePage*pageSize,sorted.length)} dari {sorted.length} data</p><Pagination aria-label="Halaman data" className="mx-0 w-auto"><PaginationContent>
      <PaginationItem><Button type="button" variant="ghost" size="icon" aria-label="Halaman sebelumnya" disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft/></Button></PaginationItem>
      {pageNumbers.map((p,i)=><PaginationItem key={`${p}-${i}`}>{p==="..."?<PaginationEllipsis/>:<Button type="button" variant={safePage===p?"default":"ghost"} size="icon" aria-current={safePage===p?"page":undefined} onClick={()=>setPage(p)}>{p}</Button>}</PaginationItem>)}
      <PaginationItem><Button type="button" variant="ghost" size="icon" aria-label="Halaman berikutnya" disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}><ChevronRight/></Button></PaginationItem>
    </PaginationContent></Pagination></div>}
  </Card>
}

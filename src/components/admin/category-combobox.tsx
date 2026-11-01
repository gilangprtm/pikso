"use client";

import { useRef, useState } from "react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger,
} from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroupAddon } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Search, ChevronsUpDown } from "lucide-react";

export function CategoryCombobox({ options, value, onChange, disabled = false }: {
  options: string[]; value: string[]; onChange: (names: string[]) => void; disabled?: boolean;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const available = [...new Set([...options, ...added, ...value])];
  const name = query.trim();
  const canCreate = name.length > 0 && name.length <= 50 && !available.some(item => item.toLowerCase() === name.toLowerCase());
  const items = canCreate ? [...available, name] : available;

  return <Field className="admin-form-field span-2">
    <FieldLabel htmlFor="categories">Kategori</FieldLabel>
    <Combobox multiple autoHighlight items={items} value={value} inputValue={query} disabled={disabled}
      onOpenChange={open => { if (!open) setQuery(""); }}
      onInputValueChange={setQuery}
      onValueChange={names => {
        if (names.length > 20) return;
        setAdded(current => [...new Set([...current, ...names])]);
        onChange(names);
        setQuery("");
      }}>
      <ComboboxTrigger ref={anchor} id="categories" aria-describedby="categories-hint" render={<Button variant="outline" />} className="h-10 w-full min-w-0 justify-between border-input bg-card px-2.5 py-2 text-left text-base font-normal sm:text-sm hover:bg-muted/50 aria-expanded:bg-card [&>svg:last-child]:hidden">
        <span className="min-w-0 flex-1 truncate" title={value.join(", ")}>
          {value.length === 0 ? <span className="text-muted-foreground">Pilih atau ketik kategori</span> : value.join(", ")}
        </span>
        {value.length > 1 && <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{value.length}</span>}
        <span className="shrink-0 text-muted-foreground"><ChevronsUpDown aria-hidden="true" className="size-4"/></span>
      </ComboboxTrigger>
      <ComboboxContent anchor={anchor} initialFocus={search} finalFocus={anchor} className="school-admin flex max-h-[min(22rem,var(--available-height))] flex-col bg-card text-card-foreground" sideOffset={4}>
        <div className="shrink-0 p-2">
          <ComboboxInput ref={search} showTrigger={false} className="h-10 w-full bg-muted/50" placeholder="Cari atau ketik kategori baru…" maxLength={50} aria-label="Cari kategori">
            <InputGroupAddon align="inline-start"><Search aria-hidden="true" className="size-4"/></InputGroupAddon>
          </ComboboxInput>
        </div>
        <ComboboxEmpty className="py-8">Kategori tidak ditemukan.</ComboboxEmpty>
        <ComboboxList className="min-h-0 max-h-60 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {(item: string) => <ComboboxItem key={item} value={item} disabled={value.length >= 20 && !value.includes(item)} className="min-h-10 cursor-pointer break-words pr-3 [&>span.absolute]:hidden">
            {/* Keep the checkmark contrast when ComboboxItem recolors highlighted descendants. */}
            <Checkbox checked={value.includes(item)} readOnly tabIndex={-1} aria-hidden="true" className="pointer-events-none [&_*]:text-primary-foreground!" />
            <span className="min-w-0 break-words">{canCreate && item === name ? `Tambahkan “${item}”` : item}</span>
          </ComboboxItem>}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
    <FieldDescription id="categories-hint" className="admin-form-hint">Pilih hingga 20 kategori. Ketik nama baru lalu pilih Tambahkan; tersimpan saat buku disimpan.</FieldDescription>
  </Field>;
}

import * as React from "react"
import { Input } from "@/components/ui/input"
import { FormFieldSet, FormField, FieldLabel, FieldDescription, FieldError } from "./field"

interface TextFieldProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  label: string
  value: string
  onChange: (value: string) => void
  description?: React.ReactNode
  error?: string | null
  required?: boolean
  /** Slug auto-generation: if true, onChange transforms value to slug */
  slug?: boolean
}

export function TextField({
  label,
  value,
  onChange,
  description,
  error,
  required,
  slug = false,
  className,
  id,
  ...inputProps
}: TextFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(slug ? val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : val)
  }

  return (
    <FormFieldSet>
      <FormField>
        <FieldLabel htmlFor={fieldId} required={required}>
          {label}
        </FieldLabel>
        <Input
          id={fieldId}
          value={value}
          required={required}
          onChange={handleChange}
          aria-invalid={!!error}
          className={className}
          {...inputProps}
        />
        {description && <FieldDescription>{description}</FieldDescription>}
      </FormField>
      <FieldError message={error} />
    </FormFieldSet>
  )
}

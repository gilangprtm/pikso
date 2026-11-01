import * as React from "react"
import { Textarea } from "@/components/ui/textarea"
import { FormFieldSet, FormField, FieldLabel, FieldDescription, FieldError } from "./field"

interface TextareaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  description?: React.ReactNode
  error?: string | null
  required?: boolean
  maxLength?: number
  rows?: number
  placeholder?: string
  /** Show character count */
  showCount?: boolean
}

export function TextareaField({
  label,
  value,
  onChange,
  description,
  error,
  required,
  maxLength,
  rows = 4,
  placeholder,
  showCount = false,
}: TextareaFieldProps) {
  const fieldId = label.toLowerCase().replace(/\s+/g, "-")

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (maxLength && val.length > maxLength) return
    onChange(val)
  }

  return (
    <FormFieldSet>
      <FormField>
        <FieldLabel htmlFor={fieldId} required={required}>
          {label}
        </FieldLabel>
        <Textarea
          id={fieldId}
          value={value}
          required={required}
          onChange={handleChange}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={!!error}
          maxLength={maxLength}
          className="resize-y min-h-[100px]"
        />
        <div className="flex items-center justify-between">
          {description && <FieldDescription>{description}</FieldDescription>}
          {showCount && maxLength && (
            <FieldDescription className="text-right ml-auto">
              {value.length}/{maxLength}
            </FieldDescription>
          )}
        </div>
      </FormField>
      <FieldError message={error} />
    </FormFieldSet>
  )
}

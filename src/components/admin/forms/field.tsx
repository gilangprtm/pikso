"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Field, FieldGroup, FieldLabel as ShadcnLabel, FieldDescription as ShadcnDescription, FieldError as ShadcnError } from "@/components/ui/field"

// Keep the existing application field API; shadcn owns the rendered primitives.
export const FormFieldSet = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <FieldGroup ref={ref} className={cn("gap-1.5", className)} {...props}/>
)
FormFieldSet.displayName = "FormFieldSet"
export const FormField = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <Field ref={ref} className={cn("gap-1.5", className)} {...props}/>
)
FormField.displayName = "FormField"
interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { required?: boolean }
export const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, children, required, ...props }, ref) => <ShadcnLabel ref={ref} className={cn("text-sm font-medium text-foreground", className)} {...props}>{children}{required && <span aria-hidden="true" className="text-destructive">*</span>}</ShadcnLabel>
)
FieldLabel.displayName = "FieldLabel"
export const FieldDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <ShadcnDescription ref={ref} className={cn("text-xs leading-relaxed", className)} {...props}/>
)
FieldDescription.displayName = "FieldDescription"
interface FieldErrorProps extends React.HTMLAttributes<HTMLDivElement> { message?: string | null | false }
export const FieldError = React.forwardRef<HTMLDivElement, FieldErrorProps>(
  ({ className, message, ...props }, ref) => message ? <ShadcnError ref={ref} className={cn("text-xs", className)} {...props}>{message}</ShadcnError> : null
)
FieldError.displayName = "FieldError"

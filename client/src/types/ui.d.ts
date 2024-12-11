import { type ReactNode, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { type VariantProps } from "class-variance-authority"

// Shared primitive component types
export type ComponentWithRef<E extends React.ElementType, P = {}> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & React.RefAttributes<React.ElementRef<E>>
>

// Common props shared across UI components
export interface BaseProps {
  className?: string
  children?: ReactNode 
}

// Type helper for components with variants
export type VariantComponent<C extends React.ElementType, V> = ComponentWithRef<C, BaseProps & VariantProps<V>>

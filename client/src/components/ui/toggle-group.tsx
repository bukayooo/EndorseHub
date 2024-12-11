"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: "default",
  variant: "default",
})

interface BaseToggleGroupProps {
  className?: string
  children?: React.ReactNode
  variant?: VariantProps<typeof toggleVariants>["variant"]
  size?: VariantProps<typeof toggleVariants>["size"]
}

interface SingleToggleGroupProps extends BaseToggleGroupProps {
  type: "single"
  value?: string
  onValueChange?: (value: string) => void
}

interface MultipleToggleGroupProps extends BaseToggleGroupProps {
  type: "multiple"
  value?: string[]
  onValueChange?: (value: string[]) => void
}

type ToggleGroupProps = SingleToggleGroupProps | MultipleToggleGroupProps

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  ToggleGroupProps
>(({ className, variant, size, children, ...props }, ref) => {
  const { type, ...restProps } = props

  // Create common props to avoid duplication
  const commonProps = {
    ref,
    className: cn("flex items-center justify-center gap-1", className)
  }

  // Type guard for multiple toggle group
  const isMultiple = (
    props: SingleToggleGroupProps | MultipleToggleGroupProps
  ): props is MultipleToggleGroupProps => props.type === "multiple"

  return (
    <>
      {isMultiple(props) ? (
        <ToggleGroupPrimitive.Root
          {...commonProps}
          type="multiple"
          {...(restProps as Omit<MultipleToggleGroupProps, keyof BaseToggleGroupProps>)}
        >
          <ToggleGroupContext.Provider value={{ variant, size }}>
            {children}
          </ToggleGroupContext.Provider>
        </ToggleGroupPrimitive.Root>
      ) : (
        <ToggleGroupPrimitive.Root
          {...commonProps}
          type="single"
          {...(restProps as Omit<SingleToggleGroupProps, keyof BaseToggleGroupProps>)}
        >
          <ToggleGroupContext.Provider value={{ variant, size }}>
            {children}
          </ToggleGroupContext.Provider>
        </ToggleGroupPrimitive.Root>
      )}
    </>
  )
})

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

type ToggleGroupItemProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  ToggleGroupItemProps
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }

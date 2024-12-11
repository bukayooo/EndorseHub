"use client"

import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

interface CommandPrimitiveElement extends HTMLDivElement {
  cmdk?: boolean;
}

type CommandPrimitiveProps<T> = React.ComponentPropsWithoutRef<'div'> & {
  children?: React.ReactNode;
} & T;

type CommandComponent<T = {}> = React.ForwardRefExoticComponent<
  CommandPrimitiveProps<T> & React.RefAttributes<CommandPrimitiveElement>
>;

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type CommandProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive> & {
  className?: string;
  children?: React.ReactNode;
};

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  CommandProps
>(({ className, children, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  >
    {children}
  </CommandPrimitive>
))

Command.displayName = CommandPrimitive.displayName

type CommandDialogProps = DialogProps & {
  children?: React.ReactNode;
};

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

type CommandInputProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
  className?: string;
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  CommandInputProps
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

type CommandListProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.List> & {
  className?: string;
  children?: React.ReactNode;
};

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  CommandListProps
>(({ className, children, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  >
    {children}
  </CommandPrimitive.List>
))

CommandList.displayName = CommandPrimitive.List.displayName

type CommandEmptyProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty> & {
  className?: string;
};

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  CommandEmptyProps
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn("py-6 text-center text-sm", className)}
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

type CommandGroupProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group> & {
  className?: string;
  children?: React.ReactNode;
};

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  CommandGroupProps
>(({ className, children, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </CommandPrimitive.Group>
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

type CommandSeparatorProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator> & {
  className?: string;
};

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  CommandSeparatorProps
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))

CommandSeparator.displayName = CommandPrimitive.Separator.displayName

type CommandItemProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> & {
  className?: string;
  children?: React.ReactNode;
};

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  CommandItemProps
>(({ className, children, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </CommandPrimitive.Item>
))

CommandItem.displayName = CommandPrimitive.Item.displayName

type CommandShortcutProps = React.HTMLAttributes<HTMLSpanElement> & {
  className?: string;
  children?: React.ReactNode;
};

const CommandShortcut = React.forwardRef<HTMLSpanElement, CommandShortcutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "ml-auto text-xs tracking-widest text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

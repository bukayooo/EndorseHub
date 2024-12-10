
import { type ReactNode } from 'react'

export type ReactChildren = {
  children?: ReactNode
}

export type WithClassName = {
  className?: string
}

export type BaseProps = ReactChildren & WithClassName

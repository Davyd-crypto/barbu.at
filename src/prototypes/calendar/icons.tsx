import type { ReactNode } from 'react'

/* Thin-stroke, Lucide-style marks */
function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

type Props = { size?: number }

export const CheckIcon = ({ size }: Props) => (
  <Icon size={size}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
)

export const ChevronLeft = ({ size }: Props) => (
  <Icon size={size}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
)

export const ChevronRight = ({ size }: Props) => (
  <Icon size={size}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
)

export const ChevronDown = ({ size }: Props) => (
  <Icon size={size}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)

/* Marks entries where something opens or starts ("UE1 Abgabe öffnet") */
export const OpensIcon = ({ size = 10 }: Props) => (
  <Icon size={size}>
    <path d="M7 5.5v13l11-6.5z" fill="currentColor" />
  </Icon>
)

export const CloseIcon = ({ size }: Props) => (
  <Icon size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const TasksIcon = ({ size }: Props) => (
  <Icon size={size}>
    <path d="M3 7l2 2 4-4M3 17l2 2 4-4M13 6h8M13 12h8M13 18h8" />
  </Icon>
)

export const CalendarIcon = ({ size }: Props) => (
  <Icon size={size}>
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icon>
)

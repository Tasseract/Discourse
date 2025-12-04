import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTimeAgo(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const secondsAgo = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (secondsAgo < 60) {
    return `${secondsAgo}s ago`
  }

  const minutesAgo = Math.floor(secondsAgo / 60)
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`
  }

  const hoursAgo = Math.floor(minutesAgo / 60)
  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`
  }

  const daysAgo = Math.floor(hoursAgo / 24)
  if (daysAgo < 7) {
    return `${daysAgo}d ago`
  }

  const weeksAgo = Math.floor(daysAgo / 7)
  if (weeksAgo < 4) {
    return `${weeksAgo}w ago`
  }

  const monthsAgo = Math.floor(daysAgo / 30)
  if (monthsAgo < 12) {
    return `${monthsAgo}mo ago`
  }

  const yearsAgo = Math.floor(monthsAgo / 12)
  return `${yearsAgo}y ago`
}

"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Sonner() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      expand
    />
  )
}

export const Toaster = Sonner

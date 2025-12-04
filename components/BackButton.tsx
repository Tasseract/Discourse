"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import React from "react";

export default function BackButton({ fallback = "/", variant = 'ghost', size = 'sm', children, }: { fallback?: string; variant?: any; size?: any; children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => {
        try {
          router.back();
        } catch (e) {
          router.push(fallback);
        }
      }}
    >
      {children ?? '← Return'}
    </Button>
  );
}

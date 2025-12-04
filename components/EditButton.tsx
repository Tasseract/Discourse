"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export default function EditButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="ghost" size="default" onClick={onClick}>
      <svg xmlns="http://www.w3.org/2000/svg" className="mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
      <span className="text-xs font-medium">EDIT</span>
    </Button>
  );
}

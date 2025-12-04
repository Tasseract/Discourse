import type { Metadata } from "next";
import "./globals.css";
import { inter } from "./fonts";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Discourse",
  description: "MMSU ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

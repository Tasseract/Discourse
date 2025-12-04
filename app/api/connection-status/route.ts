import { NextResponse } from "next/server";
import { dbConnectionStatus } from "@/lib/connection-status";

export async function GET() {
  try {
    const message = await dbConnectionStatus();
    const status = message === "Database connected" ? "connected" : "error";
    return NextResponse.json({ status, message });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

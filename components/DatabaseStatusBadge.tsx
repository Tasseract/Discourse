import { dbConnectionStatus } from "@/lib/connection-status";

export async function DatabaseStatusBadge() {
  const dbStatus = await dbConnectionStatus();
  const isConnected = dbStatus === "Database connected";
  
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
        isConnected 
          ? "bg-red-500 animate-pulse" 
          : "bg-red-600"
      }`} title={dbStatus} />
    </div>
  );
}
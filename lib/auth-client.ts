import { createAuthClient } from "better-auth/react";

const getClientBaseURL = () => {
  // Use environment variable if set
  if (typeof window !== 'undefined') {
    const publicUrl = (window as any).__PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (publicUrl) {
      return publicUrl;
    }
  }

  // Use the env variable if available
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Development fallback
  if (typeof window === 'undefined') {
    return "http://localhost:3000";
  }

  // Browser fallback - use current origin
  return typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getClientBaseURL(),
});

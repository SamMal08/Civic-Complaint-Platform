import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseKey.includes("your-publishable-key")
);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "⚠️ Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local"
  );
}

/**
 * Standard client for public queries and citizen actions
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Client with custom request headers for role-scoped RLS policies
 * @param {Record<string, string>} headers
 */
export function getSupabaseWithHeaders(headers = {}) {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers,
    },
  });
}

/**
 * Client for government actions with government role header
 */
export function getGovernmentSupabase() {
  return getSupabaseWithHeaders({
    "x-darpan-role": "government",
  });
}

/**
 * Client for citizen feedback actions with citizen identity header
 */
export function getCitizenSupabase(citizenId) {
  return getSupabaseWithHeaders({
    "x-citizen-id": citizenId || "",
  });
}

/**
 * Format timestamp into relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  }
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Maps database row (snake_case) to UI component complaint format (camelCase)
 */
export function mapComplaintFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image: row.image || null,
    category: row.category,
    location: row.location,
    distance: row.distance || null,
    time: formatRelativeTime(row.created_at),
    createdAt: row.created_at,
    supportCount: row.support_count ?? 0,
    dontSupportCount: row.dont_support_count ?? 0,
    status: row.status || "Submitted",
    priority: row.priority || "low",
    citizenId: row.citizen_id,
    actionTaken: row.action_taken || "",
    resolutionDetails: row.resolution_details || "",
    expectedResolutionDate: row.expected_resolution_date || "",
    resolutionDate: row.resolution_date || "",
    feedbackRating: row.feedback_rating ?? null,
    feedbackComment: row.feedback_comment || "",
    feedbackSubmittedAt: row.feedback_submitted_at || null,
  };
}

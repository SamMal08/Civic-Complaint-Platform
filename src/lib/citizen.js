/**
 * Temporary prototype identity mechanism.
 * Generates and persists a stable device/browser ID for the citizen in localStorage.
 * Will later be replaced by proper Supabase authentication.
 */
export function getCitizenId() {
  if (typeof window === "undefined") {
    return "";
  }

  let citizenId = localStorage.getItem("darpan_citizen_id");
  if (!citizenId) {
    // Generate a simple random identifier (e.g. citizen-uuid)
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      citizenId = `citizen-${crypto.randomUUID()}`;
    } else {
      citizenId = `citizen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    localStorage.setItem("darpan_citizen_id", citizenId);
  }

  return citizenId;
}

/**
 * Get the "logical today" date string (YYYY-MM-DD) based on a 5:00 AM EST
 * day boundary.  Before 5 AM EST, the logical day is still "yesterday".
 *
 * 5 AM EST = 10:00 UTC, so we simply check if we're before 10:00 UTC.
 */
export function getLogicalToday() {
  const now = new Date()
  const utcTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const resetMinutesUTC = 10 * 60 // 10:00 UTC = 5:00 AM EST

  // Start from the current UTC date
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  // If before 10:00 UTC (5 AM EST), the logical day is still yesterday
  if (utcTotalMinutes < resetMinutesUTC) {
    d.setUTCDate(d.getUTCDate() - 1)
  }

  return d.toISOString().split('T')[0]
}

/**
 * Get the ISO timestamp for the most recent 5 AM EST reset boundary.
 * Used as the progressResetAt marker.
 */
export function getResetTimestamp() {
  const now = new Date()
  const utcTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const resetMinutesUTC = 10 * 60 // 10:00 UTC = 5:00 AM EST

  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0, 0))

  // If before 10:00 UTC, the most recent reset was yesterday at 10:00 UTC
  if (utcTotalMinutes < resetMinutesUTC) {
    reset.setUTCDate(reset.getUTCDate() - 1)
  }

  return reset.toISOString()
}

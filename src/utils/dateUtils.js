/**
 * Default reset hour in UTC.  10 UTC = 5:00 AM EST.
 */
const DEFAULT_RESET_HOUR_UTC = 10

/**
 * Get the "logical today" date string (YYYY-MM-DD) based on a configurable
 * daily reset hour.  Before the reset hour, the logical day is still "yesterday".
 *
 * @param {number} [resetHourUTC=10] - UTC hour (0-23) of the daily reset
 */
export function getLogicalToday(resetHourUTC = DEFAULT_RESET_HOUR_UTC) {
  const now = new Date()
  const utcTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const resetMinutesUTC = resetHourUTC * 60

  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  if (utcTotalMinutes < resetMinutesUTC) {
    d.setUTCDate(d.getUTCDate() - 1)
  }

  return d.toISOString().split('T')[0]
}

/**
 * Get the ISO timestamp for the most recent daily reset boundary.
 * Used as the progressResetAt marker.
 *
 * @param {number} [resetHourUTC=10] - UTC hour (0-23) of the daily reset
 */
export function getResetTimestamp(resetHourUTC = DEFAULT_RESET_HOUR_UTC) {
  const now = new Date()
  const utcTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const resetMinutesUTC = resetHourUTC * 60

  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHourUTC, 0, 0, 0))

  if (utcTotalMinutes < resetMinutesUTC) {
    reset.setUTCDate(reset.getUTCDate() - 1)
  }

  return reset.toISOString()
}

/**
 * Get the logical day (YYYY-MM-DD) for a given ISO timestamp, using the
 * configured daily reset hour.  Timestamps before the reset hour on a given
 * calendar day belong to the previous logical day.
 *
 * @param {string} isoString - ISO timestamp to classify
 * @param {number} [resetHourUTC=10] - UTC hour (0-23) of the daily reset
 */
export function getLogicalDay(isoString, resetHourUTC = DEFAULT_RESET_HOUR_UTC) {
  const date = new Date(isoString)
  const utcTotalMinutes = date.getUTCHours() * 60 + date.getUTCMinutes()
  const resetMinutesUTC = resetHourUTC * 60

  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

  if (utcTotalMinutes < resetMinutesUTC) {
    d.setUTCDate(d.getUTCDate() - 1)
  }

  return d.toISOString().split('T')[0]
}

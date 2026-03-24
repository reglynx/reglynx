/**
 * Philadelphia CARTO API utilities.
 * Shared address normalization and query helpers for all Philly adapters.
 */

const CARTO_ENDPOINT = 'https://phl.carto.com/api/v2/sql';

/**
 * Sanitize a string for use in CARTO SQL queries.
 * Prevents SQL injection by escaping quotes, removing control chars,
 * and stripping dangerous patterns.
 */
export function sanitizeForCarto(str: string): string {
  return str
    .replace(/'/g, "''")           // escape single quotes
    .replace(/\\/g, '')            // strip backslashes
    .replace(/;/g, '')             // strip semicolons
    .replace(/--/g, '')            // strip SQL comments
    .replace(/\/\*/g, '')          // strip block comment starts
    .replace(/\*\//g, '')          // strip block comment ends
    .replace(/[\x00-\x1f]/g, '')  // strip control characters
    .trim();
}

/**
 * Normalize a property address for CARTO LIKE matching.
 * Strips unit/apt suffixes and normalizes spacing.
 */
export function normalizePhillyAddress(addressLine1: string | null | undefined): string | null {
  if (!addressLine1?.trim()) return null;

  return addressLine1
    .trim()
    .replace(/\s+(apt|suite|unit|ste|fl|floor|#)\s*\S*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Execute a CARTO SQL query and return rows.
 */
export async function queryPhillyCarto(sql: string): Promise<Record<string, unknown>[]> {
  const url = new URL(CARTO_ENDPOINT);
  url.searchParams.set('q', sql);

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!res.ok) {
    console.error(`[CARTO] HTTP ${res.status}: ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  return data?.rows || [];
}

export { CARTO_ENDPOINT };

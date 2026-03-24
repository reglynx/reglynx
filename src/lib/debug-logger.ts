/**
 * RegLynx Structured Debug Logger
 *
 * Outputs structured JSON log entries to stdout/stderr. In production (Vercel)
 * these are captured in the function log stream and can be filtered by category.
 *
 * Usage:
 *   import { logger } from '@/lib/debug-logger';
 *   logger.info('adapter_execution', 'L&I violations fetched', { recordCount: 12 });
 *   logger.error('property_resolution', 'AIS lookup failed', { address, error: err.message });
 *
 * Log levels:
 *   debug — verbose development tracing (suppressed in production unless DEBUG=true)
 *   info  — normal operational events
 *   warn  — unexpected but recoverable situations
 *   error — failures that degrade functionality
 *
 * Categories:
 *   auth                — session refresh, auth guard decisions
 *   property_resolution — identity resolver, geocoder, AIS calls
 *   adapter_execution   — each adapter fetch (method, count, state)
 *   alert_creation      — alert insertion and email dispatch
 *   report_generation   — report builds and exports
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'auth'
  | 'property_resolution'
  | 'adapter_execution'
  | 'alert_creation'
  | 'report_generation';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, unknown>;
}

// ── Level ordering ─────────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

function getMinLevel(): LogLevel {
  if (process.env.LOG_LEVEL) {
    const l = process.env.LOG_LEVEL.toLowerCase() as LogLevel;
    if (l in LEVEL_ORDER) return l;
  }
  // In production suppress debug-level logs unless explicitly enabled
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

// ── Core emit ──────────────────────────────────────────────────────────────────

function emit(
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const minLevel = getMinLevel();
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
  };

  const output = JSON.stringify(entry);

  if (level === 'error' || level === 'warn') {
    console.error(output);
  } else {
    console.log(output);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const logger = {
  debug(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    emit('debug', category, message, metadata);
  },
  info(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    emit('info', category, message, metadata);
  },
  warn(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    emit('warn', category, message, metadata);
  },
  error(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    emit('error', category, message, metadata);
  },
};

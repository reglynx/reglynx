/**
 * Structured logging utility for RegLynx.
 * Logs to console in structured JSON format for production observability.
 */

export type LogAction =
  | 'address_resolution'
  | 'identity_resolution'
  | 'adapter_execution'
  | 'billing_event'
  | 'auth_event'
  | 'property_crud'
  | 'document_generation'
  | 'compliance_check';

interface LogEntry {
  timestamp: string;
  action: LogAction;
  level: 'info' | 'warn' | 'error';
  data: Record<string, unknown>;
}

export function structuredLog(
  action: LogAction,
  data: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    action,
    level,
    data,
  };

  switch (level) {
    case 'error':
      console.error(`[RegLynx:${action}]`, JSON.stringify(entry));
      break;
    case 'warn':
      console.warn(`[RegLynx:${action}]`, JSON.stringify(entry));
      break;
    default:
      console.log(`[RegLynx:${action}]`, JSON.stringify(entry));
  }
}

/**
 * Log to the audit_log table in Supabase.
 * Used for user-facing audit trails.
 */
export async function auditLog(
  supabase: { from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: unknown }> } },
  orgId: string,
  userId: string | null,
  action: string,
  entityType: string | null,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch (err) {
    console.error('[auditLog] Failed to write audit log:', err);
  }
}

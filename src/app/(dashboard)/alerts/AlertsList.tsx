'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Check, X, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEVERITY_COLORS } from '@/lib/constants';
import type { OrgAlert, RegulatoryAlert } from '@/lib/types';

interface AlertsListProps {
  alerts: (OrgAlert & { alert: RegulatoryAlert })[];
}

const STATUS_LABELS: Record<OrgAlert['status'], string> = {
  unread: 'Unread',
  read: 'Read',
  acted: 'Acted',
  dismissed: 'Dismissed',
};

const STATUS_BADGE_COLORS: Record<OrgAlert['status'], string> = {
  unread: 'bg-blue-50 text-blue-700 border-blue-200',
  read: 'bg-slate-50 text-slate-600 border-slate-200',
  acted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dismissed: 'bg-slate-50 text-slate-400 border-slate-200',
};

export function AlertsList({ alerts }: AlertsListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(orgAlertId: string, status: OrgAlert['status']) {
    setUpdatingId(orgAlertId);
    try {
      await supabase
        .from('org_alerts')
        .update({ status })
        .eq('id', orgAlertId);
      router.refresh();
    } catch (error) {
      console.error('Failed to update alert status:', error);
    } finally {
      setUpdatingId(null);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-3">
      {alerts.map((orgAlert) => {
        const regulatoryAlert = orgAlert.alert;
        const severity = regulatoryAlert.severity;
        const colors = SEVERITY_COLORS[severity];
        const isExpanded = expandedId === orgAlert.id;
        const isUpdating = updatingId === orgAlert.id;

        return (
          <Card
            key={orgAlert.id}
            className={`transition-colors ${
              orgAlert.status === 'dismissed' ? 'opacity-60' : ''
            }`}
          >
            <CardContent className="flex flex-col gap-3">
              {/* Top row: severity badge, title, status, expand toggle */}
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => toggleExpand(orgAlert.id)}
              >
                <div className="flex flex-1 items-start gap-3">
                  <Badge
                    className={`mt-0.5 shrink-0 border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {severity}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-sm font-medium ${
                        isExpanded ? '' : 'line-clamp-1'
                      }`}
                    >
                      {regulatoryAlert.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {regulatoryAlert.source_name && (
                        <span>{regulatoryAlert.source_name}</span>
                      )}
                      <span>{regulatoryAlert.jurisdiction}</span>
                      {regulatoryAlert.effective_date && (
                        <span>
                          Effective:{' '}
                          {new Date(
                            regulatoryAlert.effective_date,
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    className={`border ${STATUS_BADGE_COLORS[orgAlert.status]}`}
                  >
                    {STATUS_LABELS[orgAlert.status]}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="space-y-4 border-t pt-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {regulatoryAlert.description}
                  </p>

                  {regulatoryAlert.source_url && (
                    <a
                      href={regulatoryAlert.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      View source
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}

                  {regulatoryAlert.affects_document_types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Affects:
                      </span>
                      {regulatoryAlert.affects_document_types.map((dt) => (
                        <Badge
                          key={dt}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {dt.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {orgAlert.status === 'unread' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => updateStatus(orgAlert.id, 'read')}
                      >
                        <Check className="size-4" />
                        Mark as Read
                      </Button>
                    )}

                    {(orgAlert.status === 'unread' ||
                      orgAlert.status === 'read') && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => updateStatus(orgAlert.id, 'dismissed')}
                      >
                        <X className="size-4" />
                        Dismiss
                      </Button>
                    )}

                    {orgAlert.status === 'dismissed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => updateStatus(orgAlert.id, 'unread')}
                      >
                        Restore
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Received{' '}
                    {new Date(orgAlert.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

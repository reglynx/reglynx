import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SEVERITY_COLORS } from '@/lib/constants';
import type { OrgAlert, RegulatoryAlert } from '@/lib/types';

interface AlertCardProps {
  alert: OrgAlert & { alert: RegulatoryAlert };
}

export function AlertCard({ alert }: AlertCardProps) {
  const severity = alert.alert.severity;
  const colors = SEVERITY_COLORS[severity];

  return (
    <Link href="/alerts">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-1 text-sm font-medium">{alert.alert.title}</h4>
            <Badge
              className={`shrink-0 ${colors.bg} ${colors.text} ${colors.border} border`}
            >
              {severity}
            </Badge>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {alert.alert.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{alert.alert.jurisdiction}</span>
            <span>
              {new Date(alert.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

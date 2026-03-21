import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';

interface DocumentStatusBadgeProps {
  status: string;
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  const label = STATUS_LABELS[status] ?? status;

  if (!colors) {
    return <Badge variant="secondary">{label}</Badge>;
  }

  return (
    <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
      {label}
    </Badge>
  );
}

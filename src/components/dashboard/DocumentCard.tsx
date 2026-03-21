import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { DOCUMENT_TYPES, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import type { Document } from '@/lib/types';

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const docType = DOCUMENT_TYPES[document.document_type as keyof typeof DOCUMENT_TYPES];

  return (
    <Link href={`/documents/${document.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-1 text-sm font-medium">{document.title}</h4>
            <DocumentStatusBadge status={document.status} />
          </div>
          {docType && (
            <p className="text-xs text-muted-foreground">{docType.label}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{document.jurisdiction}</span>
            <span>
              {new Date(document.updated_at).toLocaleDateString('en-US', {
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

import Link from 'next/link';
import { Building2, MapPin, Calendar, Home, Archive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROPERTY_TYPES } from '@/lib/constants';
import type { Property } from '@/lib/types';

interface PropertyCardProps {
  property: Property;
  showArchived?: boolean;
}

export function PropertyCard({ property, showArchived }: PropertyCardProps) {
  const typeLabel =
    PROPERTY_TYPES[property.property_type as keyof typeof PROPERTY_TYPES] ??
    property.property_type;

  const fullAddress = [
    property.address_line1,
    property.address_line2,
    `${property.city}, ${property.state} ${property.zip}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-3">
          {/* Name + type */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <h3 className="text-sm font-medium leading-tight">
                {property.name}
              </h3>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {typeLabel}
            </span>
          </div>

          {/* Address */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="line-clamp-1">{fullAddress}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Home className="size-3" />
              {property.unit_count} {property.unit_count === 1 ? 'unit' : 'units'}
            </span>
            {property.year_built && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                Built {property.year_built}
              </span>
            )}
            {showArchived && property.archived_at && (
              <span className="flex items-center gap-1 text-amber-600">
                <Archive className="size-3" />
                Archived
              </span>
            )}
          </div>

          {/* Badges */}
          {(property.is_section8 ||
            property.is_tax_credit ||
            property.has_lead_paint) && (
            <div className="flex flex-wrap gap-1.5">
              {property.is_section8 && (
                <Badge variant="secondary" className="text-[0.65rem]">
                  Section 8
                </Badge>
              )}
              {property.is_tax_credit && (
                <Badge variant="secondary" className="text-[0.65rem]">
                  Tax Credit
                </Badge>
              )}
              {property.has_lead_paint && (
                <Badge variant="destructive" className="text-[0.65rem]">
                  Lead Paint
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2, MapPin, Calendar, Home, Archive,
  MoreVertical, Pencil, ArchiveRestore, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROPERTY_TYPES } from '@/lib/constants';
import type { Property } from '@/lib/types';

interface PropertyCardProps {
  property: Property;
  showArchived?: boolean;
}

export function PropertyCard({ property, showArchived }: PropertyCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const isArchived = !!property.archived_at;

  async function handleArchiveToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading(true);
    try {
      await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archived_at: isArchived ? null : new Date().toISOString(),
        }),
      });
      router.refresh();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
      setMenuOpen(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${property.name}"? This action cannot be undone.`)) return;
    setActionLoading(true);
    try {
      await fetch(`/api/properties/${property.id}`, { method: 'DELETE' });
      router.refresh();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="relative">
      <Link href={`/properties/${property.id}`}>
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex flex-col gap-3">
            {/* Name + type + menu */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <h3 className="text-sm font-medium leading-tight">
                  {property.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-xs text-muted-foreground">
                  {typeLabel}
                </span>
              </div>
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
              {showArchived && isArchived && (
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

      {/* Action menu button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="absolute right-3 top-4 rounded-md p-1 text-muted-foreground hover:bg-slate-100 hover:text-slate-700"
        aria-label="Property actions"
      >
        <MoreVertical className="size-4" />
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-3 top-10 z-50 w-40 rounded-lg border bg-white py-1 shadow-lg">
            <Link
              href={`/properties/${property.id}/edit`}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Link>
            <button
              onClick={handleArchiveToggle}
              disabled={actionLoading}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
            >
              {isArchived ? (
                <><ArchiveRestore className="size-3.5" /> Restore</>
              ) : (
                <><Archive className="size-3.5" /> Archive</>
              )}
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { Download } from 'lucide-react';

interface Lead {
  id: string;
  email: string;
  company_name: string | null;
  city: string | null;
  state: string | null;
  property_count: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function LeadsExportButton({ leads }: { leads: Lead[] }) {
  function handleExport() {
    const header = ['email', 'company_name', 'city', 'state', 'property_count', 'message', 'status', 'created_at'];
    const rows = leads.map((l) =>
      [l.email, l.company_name, l.city, l.state, l.property_count, l.message, l.status, l.created_at]
        .map(escapeCsv)
        .join(','),
    );

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reglynx-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={leads.length === 0}
      className="inline-flex items-center gap-2 rounded-md border border-input bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-40"
    >
      <Download className="size-4" />
      Export CSV
    </button>
  );
}

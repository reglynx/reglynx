'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import { Input } from '@/components/ui/input';
import type { Document } from '@/lib/types';

type SortField = 'created_at' | 'title' | 'status' | 'document_type';
type SortDir = 'asc' | 'desc';

interface Props {
  documents: Document[];
}

export function DocumentsFilterClient({ documents }: Props) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    let result = documents;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.document_type.toLowerCase().includes(q) ||
          d.jurisdiction.toLowerCase().includes(q),
      );
    }

    if (statusFilter) {
      result = result.filter((d) => d.status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      let aVal: string = a[sortField] ?? '';
      let bVal: string = b[sortField] ?? '';
      if (sortDir === 'asc') return aVal.localeCompare(bVal);
      return bVal.localeCompare(aVal);
    });

    return result;
  }, [documents, search, sortField, sortDir, statusFilter]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="current">Current</option>
          <option value="needs_review">Needs Review</option>
          <option value="outdated">Outdated</option>
        </select>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toggleSort('created_at')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${sortField === 'created_at' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <ArrowUpDown className="size-3" />
            Date
          </button>
          <button
            onClick={() => toggleSort('title')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${sortField === 'title' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <ArrowUpDown className="size-3" />
            Title
          </button>
          <button
            onClick={() => toggleSort('status')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${sortField === 'status' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <ArrowUpDown className="size-3" />
            Status
          </button>
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} / {documents.length} documents
        </span>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No documents match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

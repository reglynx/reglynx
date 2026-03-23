'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

export interface QACriterion {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface PilotQAChecklistProps {
  criteria: QACriterion[];
}

export function PilotQAChecklist({ criteria }: PilotQAChecklistProps) {
  const [open, setOpen] = useState(false);
  const passed = criteria.filter((c) => c.passed).length;
  const total = criteria.length;
  const allPassed = passed === total;

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-slate-400" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pilot QA Checklist
          </span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
          allPassed
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {passed}/{total} passed
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-4 py-3">
          <ul className="space-y-2">
            {criteria.map((criterion) => (
              <li key={criterion.id} className="flex items-start gap-2.5">
                {criterion.passed ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700">{criterion.label}</p>
                  <p className="text-[11px] text-muted-foreground">{criterion.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

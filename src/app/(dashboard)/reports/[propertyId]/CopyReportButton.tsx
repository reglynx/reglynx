'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyReportButtonProps {
  address: string;
  overallLabel: string;
  openIssues: number;
  expiringSoon: number;
  generatedAt: string;
}

export function CopyReportButton({
  address,
  overallLabel,
  openIssues,
  expiringSoon,
  generatedAt,
}: CopyReportButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const lines = [
      `RegLynx Compliance Summary`,
      `Property: ${address}`,
      `Status: ${overallLabel}`,
      `Open Issues: ${openIssues}  ·  Expiring Soon (60d): ${expiringSoon}`,
      `Generated: ${generatedAt}`,
      ``,
      `Monitored via Philadelphia Open Data (L&I Violations, Business Licenses).`,
      `Status reflects monitored public data sources only — not a guarantee of full legal compliance.`,
      `Not legal advice. Source: RegLynx · reglynx.com`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select a hidden textarea
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent transition-colors"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? 'Copied!' : 'Copy Summary'}
    </button>
  );
}

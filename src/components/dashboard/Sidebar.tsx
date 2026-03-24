'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Bell,
  Settings,
  HelpCircle,
  ShieldCheck,
  BarChart3,
  CreditCard,
} from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { FOOTER_LEGAL_LINE } from '@/lib/constants';
import type { Organization } from '@/lib/types';

interface SidebarProps {
  org: Organization;
}

const navItems = [
  { label: 'Dashboard',  href: '/dashboard',         icon: LayoutDashboard },
  { label: 'Properties', href: '/properties',        icon: Building2 },
  { label: 'Compliance', href: '/compliance',        icon: ShieldCheck },
  { label: 'Reports',    href: '/reports',           icon: BarChart3 },
  { label: 'Documents',  href: '/documents',         icon: FileText },
  { label: 'Alerts',     href: '/alerts',            icon: Bell },
  { label: 'Billing',    href: '/settings/billing',  icon: CreditCard },
  { label: 'Settings',   href: '/settings',          icon: Settings },
];

export function Sidebar({ org }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col bg-[#0f172a] text-white md:flex">
      {/* Logo + org name */}
      <div className="flex flex-col gap-1 px-5 pt-5 pb-4">
        <Logo size="sm" className="*:text-white" />
        <p className="mt-1 truncate text-xs text-slate-400">{org.name}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-white/10 px-5 py-4">
        <a
          href="mailto:support@reglynx.com"
          className="flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white"
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          Need help?
        </a>
        <p className="mt-3 text-[10px] leading-tight text-slate-500">
          {FOOTER_LEGAL_LINE}
        </p>
      </div>
    </aside>
  );
}

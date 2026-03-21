'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Settings, HelpCircle, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Organization } from '@/lib/types';

interface TopbarProps {
  org: Organization;
  userEmail?: string;
}

export function Topbar({ org, userEmail }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : '??';

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-6">
      {/* Left: org name */}
      <h2 className="text-sm font-semibold text-slate-700">{org.name}</h2>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Link
          href="/alerts"
          className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="h-5 w-5" />
          <span className="sr-only">Alerts</span>
        </Link>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
            <Avatar size="default">
              <AvatarFallback className="bg-[#0f172a] text-xs text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8}>
            {userEmail && (
              <>
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {userEmail}
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem>
              <Link href="/settings" className="flex w-full items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <a
                href="mailto:support@reglynx.com"
                className="flex w-full items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </a>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

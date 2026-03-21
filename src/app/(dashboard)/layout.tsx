import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import type { Organization } from '@/lib/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verify authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's organization
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single<Organization>();

  if (!org) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed sidebar */}
      <Sidebar org={org} />

      {/* Main content area (offset by sidebar width on md+) */}
      <div className="flex flex-1 flex-col md:pl-[240px]">
        <Topbar org={org} userEmail={user.email} />

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

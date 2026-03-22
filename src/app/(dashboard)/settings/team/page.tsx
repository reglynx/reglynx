import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, UserPlus, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Organization, TeamMember } from '@/lib/types';

const ROLE_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  owner: { label: 'Owner', variant: 'default' },
  admin: { label: 'Admin', variant: 'secondary' },
  member: { label: 'Member', variant: 'outline' },
  viewer: { label: 'Viewer', variant: 'outline' },
};

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle<Organization>();

  if (!org) redirect('/onboarding');

  // Fetch team members
  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('org_id', org.id)
    .order('joined_at', { ascending: true });

  const teamMembers: TeamMember[] = members ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Settings
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage who has access to your organization
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Coming soon"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="py-8 text-center">
              <Shield className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                No team members yet. You are the only user.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Team invitations are coming soon.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const roleInfo =
                  ROLE_BADGE[member.role] || ROLE_BADGE.member;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {member.invited_email || member.user_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{' '}
                        {new Date(member.joined_at).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        )}
                      </p>
                    </div>
                    <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  CreditCard,
  Users,
  Mail,
  ExternalLink,
  Bell,
  Download,
  CheckCircle2,
  XCircle,
  Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import type { Organization } from '@/lib/types';

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  trialing: { label: 'Trial', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  past_due: { label: 'Past Due', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'outline' },
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let org: Organization | null = null;
  try {
    const { data, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle<Organization>();
    if (orgError) console.error('Org fetch error:', orgError);
    org = data;
  } catch (e) {
    console.error('Failed to fetch organization:', e);
  }

  if (!org) redirect('/onboarding');

  const isPaid = !!org.stripe_subscription_id;
  const planInfo = isPaid
    ? (SUBSCRIPTION_PLANS[org.subscription_plan] || SUBSCRIPTION_PLANS.pilot)
    : null;
  const statusInfo = STATUS_BADGE_MAP[org.subscription_status] || STATUS_BADGE_MAP.trialing;

  // Stripe health checks
  const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'Live' : 'Test';
  const hasPriceIds = !!(
    process.env.STRIPE_PRICE_ID_STARTER &&
    process.env.STRIPE_PRICE_ID_PROFESSIONAL &&
    process.env.STRIPE_PRICE_ID_ENTERPRISE
  );
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization, billing, and team
        </p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Your company information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-sm">{org.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entity Type</p>
              <p className="text-sm">{org.entity_type || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Employee Count</p>
              <p className="text-sm">{org.employee_count ?? 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unit Count</p>
              <p className="text-sm">{org.unit_count ?? 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Email</p>
              <p className="text-sm">{user.email ?? 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <CreditCard className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Your current plan and status</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">{isPaid && planInfo ? planInfo.name : 'Free'}</span>
            <Badge variant={statusInfo.variant}>{isPaid ? statusInfo.label : 'Free'}</Badge>
          </div>
          {isPaid && planInfo ? (
            <p className="text-sm text-muted-foreground">
              ${planInfo.price}/month
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Upgrade to monitor more properties.
            </p>
          )}
          {org.trial_ends_at && org.subscription_status === 'trialing' && isPaid && (
            <p className="text-sm text-muted-foreground">
              Trial ends{' '}
              {new Date(org.trial_ends_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
          <Link href="/settings/billing" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {isPaid ? 'Manage Billing' : 'Upgrade'}
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      {/* Billing Health (admin visibility) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Shield className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Platform Status</CardTitle>
              <CardDescription>Billing and integration health</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {stripeMode === 'Live' ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-amber-500" />
              )}
              <span>Stripe mode: <span className="font-medium">{stripeMode}</span></span>
            </div>
            <div className="flex items-center gap-2">
              {hasPriceIds ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-red-500" />
              )}
              <span>Price IDs configured: <span className="font-medium">{hasPriceIds ? 'Yes' : 'No'}</span></span>
            </div>
            <div className="flex items-center gap-2">
              {hasWebhookSecret ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-red-500" />
              )}
              <span>Webhook configured: <span className="font-medium">{hasWebhookSecret ? 'Yes' : 'No'}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="transition-colors hover:border-slate-300">
          <Link href="/settings/team" className="block p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium">Team</p>
                <p className="text-sm text-muted-foreground">
                  Manage team members and roles
                </p>
              </div>
            </div>
          </Link>
        </Card>

        <Card className="transition-colors hover:border-slate-300">
          <Link href="/settings/notifications" className="block p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Bell className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Alert email preferences and digest frequency
                </p>
              </div>
            </div>
          </Link>
        </Card>

        <Card className="transition-colors hover:border-slate-300">
          <Link href="/settings/export" className="block p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Download className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium">Data Export</p>
                <p className="text-sm text-muted-foreground">
                  Download all documents and data
                </p>
              </div>
            </div>
          </Link>
        </Card>

        <Card className="transition-colors hover:border-slate-300">
          <a href="mailto:support@reglynx.com" className="block p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Mail className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium">Contact Support</p>
                <p className="text-sm text-muted-foreground">
                  support@reglynx.com
                </p>
              </div>
            </div>
          </a>
        </Card>
      </div>
    </div>
  );
}

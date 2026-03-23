import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_ALERTS =
  process.env.RESEND_FROM_ALERTS || 'RegLynx Alerts <alerts@reglynx.com>';
const FROM_NOREPLY =
  process.env.RESEND_FROM_NOREPLY || 'RegLynx <noreply@reglynx.com>';
const FROM_BILLING =
  process.env.RESEND_FROM_BILLING || 'RegLynx Billing <billing@reglynx.com>';

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

function emailHeader(): string {
  return [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '  RegLynx — Regulatory Compliance Platform',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
  ].join('\n');
}

function emailFooter(): string {
  return [
    '',
    '---',
    '',
    'If you no longer wish to receive these emails, you can update your',
    'notification preferences in your RegLynx dashboard settings.',
    '',
    'RegLynx — Ramesses Management & Contracting LLC',
    '1700 Market St. Suite 1005, Philadelphia, PA 19103',
    '',
    '\u00A9 2026 RegLynx. All rights reserved.',
  ].join('\n');
}

function wrapEmail(body: string): string {
  return `${emailHeader()}${body}\n${emailFooter()}`;
}

// ---------------------------------------------------------------------------
// Email senders
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, orgName: string) {
  const body = [
    `Welcome to RegLynx, ${orgName}!`,
    '',
    'Your account is ready. Here is what you can do next:',
    '',
    '1. Add your properties to get jurisdiction-specific compliance alerts.',
    '2. Generate your first compliance document draft.',
    '3. Explore the alerts feed to stay ahead of regulatory changes.',
    '',
    'If you have any questions, reply to this email or reach out to',
    'support@reglynx.com.',
    '',
    'We are glad to have you on board.',
    '',
    'The RegLynx Team',
  ].join('\n');

  await getResend().emails.send({
    from: FROM_NOREPLY,
    to,
    subject: `Welcome to RegLynx, ${orgName}!`,
    text: wrapEmail(body),
  });
}

export async function sendAlertEmail(
  to: string,
  alertTitle: string,
  alertDescription: string,
  jurisdiction: string,
  dashboardUrl: string,
) {
  const body = [
    'New Regulatory Alert',
    '',
    `Title: ${alertTitle}`,
    `Jurisdiction: ${jurisdiction}`,
    '',
    alertDescription,
    '',
    'Review this alert and take action in your RegLynx dashboard:',
    dashboardUrl,
  ].join('\n');

  await getResend().emails.send({
    from: FROM_ALERTS,
    to,
    subject: `[RegLynx Alert] ${alertTitle}`,
    text: wrapEmail(body),
  });
}

export async function sendTrialEndingEmail(
  to: string,
  orgName: string,
  daysLeft: number,
) {
  const body = [
    `Your RegLynx trial for ${orgName} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
    '',
    'To continue using RegLynx without interruption, please select a',
    'subscription plan before your trial expires.',
    '',
    'Visit your billing settings to choose a plan:',
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.reglynx.com'}/settings/billing`,
    '',
    'If you have questions about which plan is right for you, reply to',
    'this email and we will be happy to help.',
    '',
    'The RegLynx Team',
  ].join('\n');

  await getResend().emails.send({
    from: FROM_BILLING,
    to,
    subject: `Your RegLynx trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    text: wrapEmail(body),
  });
}

export async function sendPaymentFailedEmail(to: string, orgName: string) {
  const body = [
    `We were unable to process the payment for your ${orgName} subscription.`,
    '',
    'Please update your payment method to avoid any interruption to your',
    'RegLynx service.',
    '',
    'Update payment method:',
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.reglynx.com'}/settings/billing`,
    '',
    'If you believe this is an error, please contact support@reglynx.com.',
    '',
    'The RegLynx Team',
  ].join('\n');

  await getResend().emails.send({
    from: FROM_BILLING,
    to,
    subject: `[Action Required] Payment failed for ${orgName}`,
    text: wrapEmail(body),
  });
}

export async function sendSubscriptionConfirmedEmail(
  to: string,
  orgName: string,
  planName: string,
) {
  const body = [
    `Your ${planName} subscription for ${orgName} is now active.`,
    '',
    'Thank you for choosing RegLynx. You now have full access to all',
    `features included in the ${planName} plan.`,
    '',
    'Manage your subscription anytime:',
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.reglynx.com'}/settings/billing`,
    '',
    'If you have questions, reach out to support@reglynx.com.',
    '',
    'The RegLynx Team',
  ].join('\n');

  await getResend().emails.send({
    from: FROM_BILLING,
    to,
    subject: `Subscription confirmed — ${planName} plan for ${orgName}`,
    text: wrapEmail(body),
  });
}

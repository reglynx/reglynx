'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component that checks sessionStorage for a stored intent
 * (set during signup when user clicked a document card on the landing page).
 * If found, redirects to the generate page with the doc type pre-selected.
 * Renders nothing visible.
 */
export function IntentRedirect() {
  const router = useRouter();

  useEffect(() => {
    const storedIntent = sessionStorage.getItem('reglynx_intent');
    if (storedIntent) {
      try {
        const { intent, doc_type, jurisdiction } = JSON.parse(storedIntent);
        sessionStorage.removeItem('reglynx_intent');

        if (intent === 'generate' && doc_type) {
          router.push(
            `/documents/generate?doc_type=${doc_type}&jurisdiction=${jurisdiction}`
          );
        }
      } catch {
        // Invalid JSON, ignore and stay on dashboard
      }
    }
  }, [router]);

  return null;
}

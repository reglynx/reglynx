import { NextResponse } from 'next/server';
import {
  sanitizeAddress,
  fetchLIViolations,
  fetchRentalLicenses,
} from '@/lib/data-sources/philadelphia-open-data';

/**
 * Public endpoint — no auth required.
 * Returns a teaser of city data for a given address.
 * Used on the landing page hero search.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') ?? '';
    const sanitized = sanitizeAddress(address);

    if (!sanitized || sanitized.length < 3) {
      return NextResponse.json(
        { error: 'Address is required (at least 3 characters)' },
        { status: 400 },
      );
    }

    // Simple heuristic: check if address looks like Philadelphia
    const addressLower = address.toLowerCase();
    const isPhiladelphia =
      addressLower.includes('philadelphia') ||
      addressLower.includes('phila') ||
      // PA zip codes for Philadelphia: 191xx
      /191\d{2}/.test(address);

    if (!isPhiladelphia) {
      return NextResponse.json({
        isPhiladelphia: false,
        message: 'Coming soon to your city. Join our waitlist for early access.',
      });
    }

    // Fetch limited teaser data — violations and rental license only
    const [violations, licenses] = await Promise.all([
      fetchLIViolations(sanitized),
      fetchRentalLicenses(sanitized),
    ]);

    const openViolations = violations.filter(
      (v) => (v.violationstatus as string)?.toLowerCase() === 'open',
    );

    const hasRentalLicense = licenses.length > 0;
    const missingDocs: string[] = [];
    if (!hasRentalLicense) missingDocs.push('Rental License');
    if (openViolations.length > 0) missingDocs.push('Violation Response Plan');
    // Common missing docs
    missingDocs.push('Fair Housing Policy', 'Emergency Action Plan', 'Lead Disclosure');

    return NextResponse.json({
      isPhiladelphia: true,
      violationCount: violations.length,
      openViolationCount: openViolations.length,
      missingDocumentCount: missingDocs.length,
      missingDocuments: missingDocs,
      estimatedFineExposure: openViolations.length * 300,
      hasRentalLicense,
    });
  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json(
      { error: 'Failed to search address' },
      { status: 500 },
    );
  }
}

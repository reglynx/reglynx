import { NextResponse } from 'next/server';
import { fetchAllCityData } from '@/lib/data-sources/philadelphia-open-data';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limit';

/**
 * Public endpoint — no auth required. Rate-limited to 20 requests/min per IP.
 * Accepts any address input. Runs the AIS identity pipeline to determine
 * whether the address is in Philadelphia. No string-matching heuristics.
 *
 * AIS (api.phila.gov) is the authoritative source — it only resolves
 * Philadelphia addresses. If AIS resolves it, it's Philly. If not, it isn't.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Rate limit: 20 requests per minute per IP
    const rateLimitMsg = checkRateLimit(getRateLimitKey(request), 20, 60_000);
    if (rateLimitMsg) {
      return NextResponse.json({ error: rateLimitMsg }, { status: 429 });
    }

    const address = searchParams.get('address')?.trim() ?? '';

    if (!address || address.length < 3) {
      return NextResponse.json(
        { error: 'Address is required (at least 3 characters)' },
        { status: 400 },
      );
    }

    // Run the full pipeline — AIS determines if this is Philadelphia.
    // No string-matching heuristics. AIS only resolves Philly addresses.
    const data = await fetchAllCityData(address);

    // If identity was not resolved, the address is either:
    // - not in Philadelphia (AIS returned nothing)
    // - a bad/incomplete address
    // Either way, we can't return city data.
    if (!data.identity.resolved) {
      // Check if AIS gave us any signal at all (standardized address means
      // AIS recognized it as Philadelphia, just couldn't find a parcel)
      const aisRecognized = !!data.identity.standardized_address;

      if (aisRecognized) {
        // AIS recognized the address (it's in Philly) but couldn't resolve parcel
        return NextResponse.json({
          isPhiladelphia: true,
          identityResolved: false,
          matchMethod: data.identity.match_method,
          standardizedAddress: data.identity.standardized_address,
          violationCount: 0,
          openViolationCount: 0,
          missingDocumentCount: 5,
          missingDocuments: ['Rental License', 'Fair Housing Policy', 'Emergency Action Plan', 'Lead Disclosure', 'Violation Response Plan'],
          estimatedFineExposure: 0,
          hasRentalLicense: false,
          message: 'Address recognized but parcel could not be resolved. Try the full street number and name.',
        });
      }

      // AIS returned nothing — not a Philadelphia address or bad input
      return NextResponse.json({
        isPhiladelphia: false,
        message: 'This address could not be found in Philadelphia records. If this is a Philadelphia address, try including the street number and name.',
      });
    }

    // Identity resolved — this is a confirmed Philadelphia property
    const hasRentalLicense = data.rentalLicenseStatus !== 'not_found';
    const missingDocs: string[] = [];
    if (!hasRentalLicense) missingDocs.push('Rental License');
    if (data.openViolationCount > 0) missingDocs.push('Violation Response Plan');
    missingDocs.push('Fair Housing Policy', 'Emergency Action Plan', 'Lead Disclosure');

    return NextResponse.json({
      isPhiladelphia: true,
      identityResolved: true,
      matchMethod: data.identity.match_method,
      matchConfidence: data.identity.match_confidence,
      standardizedAddress: data.identity.standardized_address,
      alternateAddress: data.identity.alternate_address,
      opaAccountNum: data.identity.opa_account_num,
      violationCount: data.violationCount,
      openViolationCount: data.openViolationCount,
      missingDocumentCount: missingDocs.length,
      missingDocuments: missingDocs,
      estimatedFineExposure: data.estimatedFineExposure,
      hasRentalLicense,
      rentalLicenseStatus: data.rentalLicenseStatus,
      assessment: data.assessment ? {
        owner: data.assessment.owner_1,
        yearBuilt: data.assessment.year_built,
        marketValue: data.assessment.market_value,
        zoning: data.assessment.zoning,
      } : null,
      evidence: data.evidence,
      sources: data.sources,
      violations: data.violations.slice(0, 10),
      permits: data.permits.slice(0, 5),
      rentalLicenses: data.rentalLicenses.slice(0, 3),
    });
  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json(
      { error: 'Failed to search address' },
      { status: 500 },
    );
  }
}

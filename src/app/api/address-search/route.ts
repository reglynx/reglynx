import { NextResponse } from 'next/server';
import { fetchAllCityData } from '@/lib/data-sources/philadelphia-open-data';

/**
 * Public endpoint — no auth required.
 * Returns a teaser of city data for a given address.
 * Now uses the OPA-keyed identity pipeline for accurate results.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.trim() ?? '';

    if (!address || address.length < 3) {
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
      /191\d{2}/.test(address);

    if (!isPhiladelphia) {
      return NextResponse.json({
        isPhiladelphia: false,
        message: 'Coming soon to your city. Join our waitlist for early access.',
      });
    }

    // Run the full OPA-keyed pipeline
    const data = await fetchAllCityData(address);

    // If identity failed, still return what we can
    if (!data.identity.resolved) {
      return NextResponse.json({
        isPhiladelphia: true,
        identityResolved: false,
        matchMethod: data.identity.match_method,
        violationCount: 0,
        openViolationCount: 0,
        missingDocumentCount: 5,
        missingDocuments: ['Rental License', 'Fair Housing Policy', 'Emergency Action Plan', 'Lead Disclosure', 'Violation Response Plan'],
        estimatedFineExposure: 0,
        hasRentalLicense: false,
        message: 'We could not resolve this address to a specific Philadelphia parcel. Try including the full street address.',
      });
    }

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
    });
  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json(
      { error: 'Failed to search address' },
      { status: 500 },
    );
  }
}

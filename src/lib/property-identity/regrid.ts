import type { PropertyIdentityProvider } from './provider-interface';
import type { PropertyIdentity, NormalizedAddress } from '@/lib/types';

const REGRID_API_KEY = process.env.REGRID_API_KEY || '';
const REGRID_BASE_URL = 'https://app.regrid.com/api/v2';

/**
 * Regrid property identity provider.
 * Resolves U.S. addresses to parcel IDs and property identifiers.
 * https://regrid.com/api
 */
export class RegridProvider implements PropertyIdentityProvider {
  readonly name = 'regrid';

  async resolve(address: NormalizedAddress): Promise<PropertyIdentity | null> {
    if (!REGRID_API_KEY) {
      console.warn('[Regrid] No API key configured — skipping resolution');
      return null;
    }

    try {
      // Try address-based parcel lookup
      const result = await this.lookupByAddress(address);
      return result;
    } catch (err) {
      console.error('[Regrid] resolve error:', err);
      return null;
    }
  }

  private async lookupByAddress(address: NormalizedAddress): Promise<PropertyIdentity | null> {
    const query = [
      address.street,
      address.city,
      address.state,
      address.zip,
    ].filter(Boolean).join(', ');

    const url = new URL(`${REGRID_BASE_URL}/parcels/address`);
    url.searchParams.set('query', query);

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${REGRID_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`[Regrid] API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const parcels = data?.parcels?.features || data?.features || [];

    if (parcels.length === 0) {
      return null;
    }

    // Take the best match (first result)
    const parcel = parcels[0];
    const props = parcel.properties || {};

    return {
      nationalPropertyId: props.parcelnumb || props.ll_uuid || null,
      localParcelId: props.parcelnumb || null,
      localTaxId: props.taxamt ? String(props.taxamt) : null,
      provider: this.name,
      confidence: parcels.length === 1 ? 0.95 : 0.75,
      resolvedAt: new Date().toISOString(),
      rawResponse: props,
    };
  }
}

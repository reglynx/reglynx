import type { AddressProvider } from './provider-interface';
import type { NormalizedAddress, AddressSuggestion } from '@/lib/types';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '';

/**
 * Google Places Autocomplete (New) provider for U.S. address resolution.
 *
 * Uses the Google Maps JavaScript API on the client side for autocomplete,
 * and the Geocoding REST API on the server side for validation.
 */
export class GooglePlacesProvider implements AddressProvider {
  readonly name = 'google_places';

  async autocomplete(query: string): Promise<AddressSuggestion[]> {
    if (!GOOGLE_API_KEY || !query || query.length < 3) return [];

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query);
    url.searchParams.set('types', 'address');
    url.searchParams.set('components', 'country:us');
    url.searchParams.set('key', GOOGLE_API_KEY);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) return [];
      const data = await res.json();

      return (data.predictions || []).map((p: Record<string, unknown>) => ({
        placeId: p.place_id as string,
        description: p.description as string,
        mainText: (p.structured_formatting as Record<string, string>)?.main_text || '',
        secondaryText: (p.structured_formatting as Record<string, string>)?.secondary_text || '',
      }));
    } catch {
      console.error('[GooglePlaces] autocomplete error');
      return [];
    }
  }

  async getDetails(placeId: string): Promise<NormalizedAddress | null> {
    if (!GOOGLE_API_KEY || !placeId) return null;

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'address_components,formatted_address,geometry');
    url.searchParams.set('key', GOOGLE_API_KEY);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = await res.json();
      const result = data.result;
      if (!result) return null;

      return this.parseAddressComponents(
        result.address_components,
        result.formatted_address,
        result.geometry?.location,
        placeId,
      );
    } catch {
      console.error('[GooglePlaces] getDetails error');
      return null;
    }
  }

  async geocode(address: string): Promise<NormalizedAddress | null> {
    if (!GOOGLE_API_KEY || !address) return null;

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('components', 'country:US');
    url.searchParams.set('key', GOOGLE_API_KEY);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = await res.json();
      const result = data.results?.[0];
      if (!result) return null;

      return this.parseAddressComponents(
        result.address_components,
        result.formatted_address,
        result.geometry?.location,
        result.place_id,
      );
    } catch {
      console.error('[GooglePlaces] geocode error');
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private parseAddressComponents(
    components: Array<{ long_name: string; short_name: string; types: string[] }>,
    formattedAddress: string,
    location: { lat: number; lng: number } | null,
    placeId: string | null,
  ): NormalizedAddress {
    const get = (type: string) =>
      components?.find((c) => c.types.includes(type));

    const streetNumber = get('street_number')?.long_name || '';
    const route = get('route')?.long_name || '';
    const unit = get('subpremise')?.long_name || null;
    const city =
      get('locality')?.long_name ||
      get('sublocality_level_1')?.long_name ||
      get('administrative_area_level_3')?.long_name ||
      '';
    const state = get('administrative_area_level_1')?.short_name || '';
    const zip = get('postal_code')?.long_name || '';
    const county = get('administrative_area_level_2')?.long_name || null;

    return {
      street: [streetNumber, route].filter(Boolean).join(' '),
      unit,
      city,
      state,
      zip,
      county,
      country: 'US',
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      placeId: placeId ?? null,
      formattedAddress: formattedAddress || '',
      provider: this.name,
      confidence: location ? 0.95 : 0.7,
    };
  }
}

import type { NormalizedAddress, AddressSuggestion } from '@/lib/types';

/**
 * Pluggable address provider interface.
 * Implementations: GooglePlacesProvider, HereProvider, MapboxProvider, etc.
 */
export interface AddressProvider {
  readonly name: string;

  /**
   * Autocomplete: returns suggestions as user types.
   * Restricted to U.S. addresses only.
   */
  autocomplete(query: string): Promise<AddressSuggestion[]>;

  /**
   * Validate and normalize: takes a place ID or raw address
   * and returns fully structured, normalized address data.
   */
  getDetails(placeId: string): Promise<NormalizedAddress | null>;

  /**
   * Geocode a raw address string into structured data.
   * Fallback when no placeId is available.
   */
  geocode(address: string): Promise<NormalizedAddress | null>;
}

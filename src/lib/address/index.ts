import type { AddressProvider } from './provider-interface';
import { GooglePlacesProvider } from './google-places';

export type { AddressProvider } from './provider-interface';

/**
 * Factory: returns the configured address provider based on env vars.
 * Defaults to Google Places.
 */
export function getAddressProvider(): AddressProvider {
  const provider = process.env.NEXT_PUBLIC_ADDRESS_PROVIDER || 'google_places';

  switch (provider) {
    case 'google_places':
    default:
      return new GooglePlacesProvider();
  }
}

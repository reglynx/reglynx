import type { PropertyIdentityProvider } from './provider-interface';
import { RegridProvider } from './regrid';

export type { PropertyIdentityProvider } from './provider-interface';

/**
 * Factory: returns the configured property identity provider.
 * Defaults to Regrid.
 */
export function getPropertyIdentityProvider(): PropertyIdentityProvider {
  const provider = process.env.PROPERTY_IDENTITY_PROVIDER || 'regrid';

  switch (provider) {
    case 'regrid':
    default:
      return new RegridProvider();
  }
}

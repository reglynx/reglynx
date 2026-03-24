import type { PropertyIdentity, NormalizedAddress } from '@/lib/types';

/**
 * Pluggable U.S. property identity provider interface.
 * Implementations: RegridProvider, AttomProvider, etc.
 */
export interface PropertyIdentityProvider {
  readonly name: string;

  /**
   * Resolve a property identity from a normalized address.
   * Returns parcel IDs, tax IDs, and national property identifiers.
   */
  resolve(address: NormalizedAddress): Promise<PropertyIdentity | null>;
}

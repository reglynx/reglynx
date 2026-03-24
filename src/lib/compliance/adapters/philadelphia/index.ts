import { registerAdapter } from '../../adapter-interface';
import { PhiladelphiaLIViolationsAdapter } from './li-violations';
import { PhiladelphiaRentalLicenseAdapter } from './rental-license';
import { PhiladelphiaPermitsAdapter } from './permits';

/**
 * Register all Philadelphia compliance adapters.
 * Call this once at app startup.
 */
export function registerPhiladelphiaAdapters(): void {
  registerAdapter(new PhiladelphiaLIViolationsAdapter());
  registerAdapter(new PhiladelphiaRentalLicenseAdapter());
  registerAdapter(new PhiladelphiaPermitsAdapter());
}

export {
  PhiladelphiaLIViolationsAdapter,
  PhiladelphiaRentalLicenseAdapter,
  PhiladelphiaPermitsAdapter,
};

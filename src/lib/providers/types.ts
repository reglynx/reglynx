/**
 * Provider abstraction interfaces for multi-city compliance coverage.
 *
 * These interfaces define the contracts for:
 *   - Property identity resolution (geocoding + parcel ID lookup)
 *   - Data source adapters by technology type (Socrata, ArcGIS, CKAN, custom)
 *
 * Adding a new city requires:
 *   1. Implementing one PropertyIdentityProvider for the city
 *   2. Implementing one or more DataSourceAdapter subtypes for each dataset
 *   3. Registering the city in jurisdiction-config.ts
 *   4. Adding the adapters to adapter-registry.ts
 *
 * No changes to the compliance engine are needed — it calls
 * AdapterRegistry.getAdapters(jurisdiction) and runs whatever comes back.
 */

// ── Jurisdiction ──────────────────────────────────────────────────────────────

export interface Jurisdiction {
  city: string;   // e.g., "Philadelphia"
  state: string;  // e.g., "PA"
  country: string; // e.g., "US"
}

/** Canonical jurisdiction key used as a registry lookup key */
export function jurisdictionKey(j: Jurisdiction): string {
  return `${j.city.toLowerCase().replace(/\s+/g, '_')}_${j.state.toUpperCase()}`;
}

// ── Property identity provider ────────────────────────────────────────────────

/**
 * Resolves a property's stable external identifiers (parcel ID, tax ID, etc.)
 * for a given jurisdiction.
 */
export interface PropertyIdentityProvider {
  readonly jurisdiction: Jurisdiction;
  readonly providerName: string;

  /**
   * Resolve a property address to stable IDs.
   * Returns null if the address cannot be resolved in this jurisdiction.
   */
  resolveIdentity(input: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    zip: string;
  }): Promise<{
    normalizedAddress: string | null;
    localParcelId: string | null;
    localTaxId: string | null;
    latitude: number | null;
    longitude: number | null;
    confidence: number;
  } | null>;
}

// ── Data source adapters ──────────────────────────────────────────────────────

import type { AdapterResult, AdapterQueryInput, ComplianceItemType } from '../compliance/types';

/**
 * Base interface for all compliance data source adapters.
 * Each adapter covers one dataset / one compliance category.
 */
export interface ComplianceDataAdapter {
  /** Unique name, e.g., "philly_lni_violations" */
  readonly adapterName: string;
  /** Which compliance item type(s) this adapter informs */
  readonly itemTypes: ComplianceItemType[];
  readonly jurisdiction: Jurisdiction;

  /** Fetch records for a property */
  fetch(input: AdapterQueryInput): Promise<AdapterResult>;
}

// ── Socrata (SODA) data source ────────────────────────────────────────────────

/**
 * Adapter for any Socrata Open Data API dataset.
 * Used by Philadelphia, NYC, Chicago, Baltimore, and many other cities.
 *
 * Example endpoint: https://data.phila.gov/resource/6vkh-6s3i.json
 */
export interface SocrataDataSource extends ComplianceDataAdapter {
  readonly type: 'socrata';
  /** Base URL for the Socrata dataset, e.g. https://data.phila.gov/resource/6vkh-6s3i.json */
  readonly datasetUrl: string;
  /** Optional Socrata app token for higher rate limits */
  readonly appToken?: string;
  /** Primary key field name used for OPA/parcel lookups, e.g. "opa_account_num" */
  readonly parcelIdField?: string;
  /** Address field name in the dataset, e.g. "address" */
  readonly addressField?: string;
}

// ── ArcGIS Feature Service ────────────────────────────────────────────────────

/**
 * Adapter for ESRI ArcGIS Feature Service REST APIs.
 * Used by many county/state GIS portals and some municipalities.
 *
 * Example: https://services.arcgis.com/{org}/arcgis/rest/services/{layer}/query
 */
export interface ArcGISFeatureService extends ComplianceDataAdapter {
  readonly type: 'arcgis';
  /** Feature service base URL */
  readonly serviceUrl: string;
  /** Layer index (default 0) */
  readonly layerIndex?: number;
  /** Field to match against parcel ID */
  readonly parcelIdField?: string;
  /** Field to match against address */
  readonly addressField?: string;
}

// ── CKAN data source ──────────────────────────────────────────────────────────

/**
 * Adapter for CKAN open data portals (used by many cities / federal agencies).
 * API docs: https://docs.ckan.org/en/stable/api/index.html
 *
 * Example: https://data.baltimorecity.gov/api/3/action/datastore_search
 */
export interface CKANDataSource extends ComplianceDataAdapter {
  readonly type: 'ckan';
  /** CKAN portal base URL */
  readonly portalUrl: string;
  /** CKAN resource (dataset) ID */
  readonly resourceId: string;
  /** Field to match against parcel ID */
  readonly parcelIdField?: string;
  /** Field to match against address */
  readonly addressField?: string;
}

// ── Custom municipal API ──────────────────────────────────────────────────────

/**
 * Adapter for municipality-specific APIs that don't follow a standard schema.
 * Each city may have its own authentication, query format, and response structure.
 */
export interface CustomMunicipalAPI extends ComplianceDataAdapter {
  readonly type: 'custom';
  /** Human-readable description of the API */
  readonly description: string;
  /** Base URL of the API */
  readonly baseUrl: string;
  /** Authentication scheme, if any */
  readonly authScheme?: 'api_key' | 'oauth2' | 'basic' | 'none';
}

// ── Union type for all adapter types ──────────────────────────────────────────

export type DataSource =
  | SocrataDataSource
  | ArcGISFeatureService
  | CKANDataSource
  | CustomMunicipalAPI;

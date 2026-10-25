import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export const DEFAULT_OTA_MANIFEST_URL =
  'https://raw.githubusercontent.com/shahriyareram/amader-songothon-v2/main/ota-manifest.json';

export const CURRENT_BASELINE_VERSION = '1.0.1';

export const STORAGE_KEY_STAGED_VERSION = 'amader_songothon_ota_staged_version';

export interface OtaManifest {
  version: string;
  url: string;
  checksum: string;
  releaseNotes?: string;
  publishedAt?: string;
}

export interface AvailableOtaInfo {
  hasUpdate: boolean;
  manifest: OtaManifest;
  currentVersion: string;
  newVersion: string;
  isAlreadyStaged: boolean;
  reason?: string;
}

export interface OtaDownloadResult {
  success: boolean;
  version?: string;
  error?: string;
}

/**
 * Validates the structure and fields of an OTA manifest object.
 * Enforces:
 * - version: non-empty string
 * - url: valid HTTPS URL
 * - checksum: exact 64-character SHA-256 hexadecimal digest (as produced by Capgo CLI)
 */
export function isValidOtaManifest(data: any): data is OtaManifest {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'string' || data.version.trim() === '') return false;
  if (typeof data.url !== 'string' || !/^https:\/\/[^\s]+$/i.test(data.url.trim())) return false;
  if (typeof data.checksum !== 'string' || !/^[a-f0-9]{64}$/i.test(data.checksum.trim())) return false;
  return true;
}

/**
 * Normalizes any raw bundle version string to a clean semantic version.
 * If raw version is empty, 'builtin', 'unknown', or undefined, it resolves to CURRENT_BASELINE_VERSION ('1.0.1')
 * so that clean baseline APK installs are recognized as up-to-date and do not
 * prompt for obsolete baseline versions.
 */
export function normalizeBundleVersion(rawVersion?: string | null): string {
  const clean = (rawVersion || '').replace(/^v/i, '').trim();
  if (!clean || clean.toLowerCase() === 'builtin' || clean.toLowerCase() === 'unknown') {
    return CURRENT_BASELINE_VERSION;
  }
  return clean;
}

/**
 * Compares two semantic version strings (e.g. "1.0.2" vs "1.0.1").
 * Normalizes 'builtin', 'unknown', or empty versions to CURRENT_BASELINE_VERSION ('1.0.1').
 * Returns:
 *   1 if a > b (a is newer)
 *  -1 if a < b (a is older)
 *   0 if a === b (versions are equal)
 */
export function compareVersions(a: string, b: string): number {
  const cleanA = normalizeBundleVersion(a);
  const cleanB = normalizeBundleVersion(b);

  if (cleanA === cleanB) return 0;

  const partsA = cleanA.split('.').map((p) => parseInt(p, 10) || 0);
  const partsB = cleanB.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const valA = partsA[i] || 0;
    const valB = partsB[i] || 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
}

/**
 * Fetches the public GitHub OTA manifest with a cache-busting timestamp.
 */
export async function fetchOtaManifest(manifestUrl = DEFAULT_OTA_MANIFEST_URL): Promise<OtaManifest | null> {
  try {
    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(`${manifestUrl}${cacheBuster}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (isValidOtaManifest(json)) {
      return {
        version: json.version.trim(),
        url: json.url.trim(),
        checksum: json.checksum.trim().toLowerCase(),
        releaseNotes: json.releaseNotes,
        publishedAt: json.publishedAt,
      };
    }
    return null;
  } catch {
    // Network or JSON parsing failure — fail silently and safely
    return null;
  }
}

/**
 * Checks if a newer OTA update is available from the public manifest.
 *
 * Characteristics:
 * - Read-only operation: DOES NOT download or stage any bundle
 * - Checks Capgo's currently active bundle version
 * - Sanitizes stale staged markers if current active version is already at or ahead
 * - Returns detailed update information only if a newer version is ready to be installed
 */
export async function checkAvailableOtaUpdate(
  manifestUrl = DEFAULT_OTA_MANIFEST_URL
): Promise<AvailableOtaInfo | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const manifest = await fetchOtaManifest(manifestUrl);
    if (!manifest) {
      return null;
    }

    const currentInfo = await CapacitorUpdater.current();
    const activeVersion = normalizeBundleVersion(currentInfo.bundle?.version);

    // Staging marker hygiene: if the active bundle is already at or ahead of staged version, clear it
    try {
      const stagedMarker = localStorage.getItem(STORAGE_KEY_STAGED_VERSION);
      if (stagedMarker && compareVersions(activeVersion, stagedMarker) >= 0) {
        localStorage.removeItem(STORAGE_KEY_STAGED_VERSION);
      }
    } catch {
      // Storage access error — continue safely
    }

    // Never update if the manifest version is equal or older than active running bundle
    if (compareVersions(manifest.version, activeVersion) <= 0) {
      return {
        hasUpdate: false,
        manifest,
        currentVersion: activeVersion,
        newVersion: manifest.version,
        isAlreadyStaged: false,
        reason: 'already_up_to_date',
      };
    }

    // Check if this exact version was already downloaded and staged with next()
    let isAlreadyStaged = false;
    try {
      const currentStaged = localStorage.getItem(STORAGE_KEY_STAGED_VERSION);
      if (currentStaged === manifest.version) {
        isAlreadyStaged = true;
      }
    } catch {
      // Storage access error
    }

    return {
      hasUpdate: true,
      manifest,
      currentVersion: activeVersion,
      newVersion: manifest.version,
      isAlreadyStaged,
    };
  } catch {
    return null;
  }
}

/**
 * Downloads the specified OTA bundle zip and stages it via next({ id }) for the next launch.
 *
 * Characteristics:
 * - User-initiated: only called when member clicks "এখন আপডেট করুন"
 * - Verifies SHA-256 checksum natively before extraction
 * - Uses next({ id: bundle.id }) to avoid abruptly killing current user session
 * - Saves staged marker in storage ONLY after next() succeeds
 * - Fails safely with localized error message if download or checksum fails
 */
export async function downloadAndStageOtaUpdate(manifest: OtaManifest): Promise<OtaDownloadResult> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'ওয়েব প্রিভিউতে ওটিএ আপডেট প্রযোজ্য নয়।' };
  }

  if (!isValidOtaManifest(manifest)) {
    return { success: false, error: 'আপডেট ম্যানিফেস্টের তথ্য অসম্পূর্ণ বা ত্রুটিপূর্ণ।' };
  }

  try {
    const currentInfo = await CapacitorUpdater.current();
    const activeVersion = normalizeBundleVersion(currentInfo.bundle?.version);

    if (compareVersions(manifest.version, activeVersion) <= 0) {
      return { success: false, error: 'অ্যাপটি ইতিমধ্যে সর্বশেষ সংস্করণে রয়েছে।' };
    }

    // 1. Download bundle zip with native SHA-256 checksum verification
    const bundle = await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
      checksum: manifest.checksum,
    });

    if (!bundle || !bundle.id) {
      return { success: false, error: 'বান্ডেল ডাউনলোড সম্পন্ন করা যায়নি (Bundle ID অনুপস্থিত)।' };
    }

    // 2. Stage bundle for next app restart without killing current session
    await CapacitorUpdater.next({ id: bundle.id });

    // 3. ONLY save staged marker after next() succeeds
    try {
      localStorage.setItem(STORAGE_KEY_STAGED_VERSION, manifest.version);
    } catch {
      // Storage access error
    }

    return {
      success: true,
      version: manifest.version,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.warn('[OTA] Download and stage failed:', errorMsg);
    return {
      success: false,
      error: errorMsg || 'আপডেট ডাউনলোড বা যাচাই করতে সমস্যা হয়েছে।',
    };
  }
}

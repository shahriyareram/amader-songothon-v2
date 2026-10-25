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
 * - Handles empty, 'builtin', 'unknown', or undefined versions.
 * - If the version is numeric and <= CURRENT_BASELINE_VERSION (e.g. "1.0", "1.0.0"),
 *   it resolves to CURRENT_BASELINE_VERSION ('1.0.1') because the APK build was pre-packaged
 *   with the v1.0.1 codebase while Android's native versionName was configured as "1.0".
 * - Higher actual OTA versions (e.g. "1.0.2", "1.1.0") are preserved.
 */
export function normalizeBundleVersion(rawVersion?: string | null): string {
  const clean = (rawVersion || '').replace(/^v/i, '').trim();
  if (!clean || clean.toLowerCase() === 'builtin' || clean.toLowerCase() === 'unknown') {
    return CURRENT_BASELINE_VERSION;
  }

  const parts = clean.split('.').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) {
    return clean;
  }

  const baselineParts = CURRENT_BASELINE_VERSION.split('.').map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts.length, baselineParts.length);
  let isLessOrEqual = true;
  for (let i = 0; i < maxLen; i++) {
    const p = parts[i] || 0;
    const b = baselineParts[i] || 0;
    if (p > b) {
      isLessOrEqual = false;
      break;
    }
    if (p < b) {
      isLessOrEqual = true;
      break;
    }
  }

  if (isLessOrEqual) {
    return CURRENT_BASELINE_VERSION;
  }

  return clean;
}

/**
 * Detects whether the current execution context is the APK bundled baseline
 * (as opposed to an external OTA bundle downloaded and loaded by Capgo).
 */
export function isBundledBaseline(
  currentInfo?: { bundle?: { id?: string; name?: string; version?: string } | null; native?: string } | null
): boolean {
  if (!currentInfo || !currentInfo.bundle) return true;
  const bundleId = (currentInfo.bundle.id || '').trim().toLowerCase();
  const bundleName = (currentInfo.bundle.name || '').trim().toLowerCase();
  if (!bundleId || bundleId === 'builtin' || bundleName === 'builtin') {
    return true;
  }
  return false;
}

/**
 * Resolves the currently active running version from CapacitorUpdater.current().
 * If the app is running the bundled APK assets (id: 'builtin' / empty / version <= baseline),
 * it returns CURRENT_BASELINE_VERSION ('1.0.1').
 * Otherwise, if an OTA bundle is active, it returns that bundle's normalized version.
 */
export function getActiveRunningVersion(
  currentInfo?: { bundle?: { id?: string; name?: string; version?: string } | null; native?: string } | null
): string {
  if (isBundledBaseline(currentInfo)) {
    return CURRENT_BASELINE_VERSION;
  }
  return normalizeBundleVersion(currentInfo?.bundle?.version);
}

/**
 * Verifies that the OTA ZIP bundle URL exists and is downloadable (returns HTTP 200/206).
 * Performs a HEAD request with automatic redirect following, and falls back to a range GET request
 * if HEAD is rejected with 405 Method Not Allowed.
 */
export async function verifyOtaBundleUrl(url: string): Promise<boolean> {
  if (!url || !/^https:\/\/[^\s]+$/i.test(url.trim())) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const headRes = await fetch(url.trim(), {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (headRes.ok) return true;

      // If server does not support HEAD (405), fallback to range GET
      if (headRes.status === 405) {
        const getController = new AbortController();
        const getTimer = setTimeout(() => getController.abort(), 6000);
        try {
          const getRes = await fetch(url.trim(), {
            method: 'GET',
            headers: { Range: 'bytes=0-0' },
            signal: getController.signal,
          });
          clearTimeout(getTimer);
          return getRes.ok || getRes.status === 206;
        } catch {
          clearTimeout(getTimer);
          return false;
        }
      }
      return false;
    } catch {
      clearTimeout(timer);
      return false;
    }
  } catch {
    return false;
  }
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
 * - Verifies that the release ZIP is actually reachable before declaring update available
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
    const activeVersion = getActiveRunningVersion(currentInfo);

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

    // Requirement 6: Verify that the OTA release ZIP actually exists before declaring an update available
    const isZipReachable = await verifyOtaBundleUrl(manifest.url);
    if (!isZipReachable) {
      console.warn(
        `[OTA] Manifest specifies version ${manifest.version}, but ZIP asset is unreachable (HTTP 404/network): ${manifest.url}`
      );
      return {
        hasUpdate: false,
        manifest,
        currentVersion: activeVersion,
        newVersion: manifest.version,
        isAlreadyStaged: false,
        reason: 'bundle_zip_unreachable',
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
    const activeVersion = getActiveRunningVersion(currentInfo);

    if (compareVersions(manifest.version, activeVersion) <= 0) {
      return { success: false, error: 'অ্যাপটি ইতিমধ্যে সর্বশেষ সংস্করণে রয়েছে।' };
    }

    // Verify ZIP existence before attempting download
    const isZipReachable = await verifyOtaBundleUrl(manifest.url);
    if (!isZipReachable) {
      return { success: false, error: 'আপডেট প্যাকেজটি (ZIP) সার্ভারে পাওয়া যায়নি (404 Not Found)।' };
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

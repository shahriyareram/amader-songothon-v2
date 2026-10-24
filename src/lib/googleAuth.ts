/**
 * Google OAuth 2.0 & Gmail API Configuration
 *
 * Configured specifically for Admin Password Recovery via Gmail OTP.
 * Uses Google Identity Services (GSI) Token Client model for secure client-side
 * authorization without exposing client secrets.
 */

const env = (import.meta as any).env;
export const GOOGLE_OAUTH_CLIENT_ID =
  (env && env.VITE_GOOGLE_OAUTH_CLIENT_ID) ||
  '511488965421-2h52lrf2d7r6at5e6nugi7mct1lmqpfe.apps.googleusercontent.com';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export const AUTHORIZED_ADMIN_RECOVERY_EMAILS = [
  'shahriyareram3@gmail.com',
  'shahriyareram94@gmail.com',
] as const;

export type AuthorizedRecoveryEmail = (typeof AUTHORIZED_ADMIN_RECOVERY_EMAILS)[number];

export function isAuthorizedRecoveryEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized === 'shahriyareram3@gmail.com' ||
    normalized === 'shahriyareram94@gmail.com'
  );
}

/**
 * Request Google OAuth Access Token via Google Identity Services (GSI) Token Client
 * Uses browser popup model without requiring client secret or redirect URIs.
 */
export function requestGoogleAccessToken(hintEmail?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google || !google.accounts || !google.accounts.oauth2) {
      return reject(
        new Error('Google Identity Services লাইব্রেরি এখনও লোড হয়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।')
      );
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: GMAIL_SEND_SCOPE,
        hint: hintEmail || undefined,
        callback: (response: any) => {
          if (response.error) {
            console.error('Google OAuth error:', response);
            reject(new Error(response.error_description || response.error || 'Google অনুমোদন বাতিল বা ব্যর্থ হয়েছে।'));
          } else if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('কোনো Google Access Token পাওয়া যায়নি।'));
          }
        },
        error_callback: (err: any) => {
          console.error('Google token client error:', err);
          reject(new Error(err?.message || 'Google অনুমোদন পপ-আপ প্রদর্শনে ত্রুটি হয়েছে।'));
        },
      });

      // Trigger OAuth popup prompt
      client.requestAccessToken();
    } catch (e: any) {
      reject(new Error(e?.message || 'Google OAuth প্রারম্ভে ত্রুটি হয়েছে।'));
    }
  });
}


// lib/phone-email.ts
// Integration with Phone.Email Free Phone Verification / SMS OTP Service
// Official Docs: https://www.phone.email/docs-sign-in-with-phone

export interface PhoneEmailUserData {
  status: number;
  country_code?: string;
  phone_no?: string;
  ph_email_jwt?: string;
  message?: string;
}

export interface VerifiedPhoneUser {
  success: boolean;
  cleanMobile?: string; // 10-digit clean mobile number
  countryCode?: string;
  fullPhone?: string;
  jwt?: string;
  error?: string;
}

export const DEFAULT_PHONE_EMAIL_CLIENT_ID = '14193176295000530175';

export const PHONE_EMAIL_CLIENT_ID =
  process.env.NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID ||
  process.env.PHONE_EMAIL_CLIENT_ID ||
  DEFAULT_PHONE_EMAIL_CLIENT_ID;

/**
 * Server-side verification of access_token from Phone.Email
 * Exchanges access_token with Phone.Email API endpoint to retrieve the verified mobile number
 */
export async function verifyPhoneEmailToken(accessToken: string): Promise<VerifiedPhoneUser> {
  if (!accessToken || typeof accessToken !== 'string') {
    return { success: false, error: 'Access token is required.' };
  }

  const clientId = PHONE_EMAIL_CLIENT_ID;
  if (!clientId) {
    return {
      success: false,
      error: 'Phone.Email CLIENT_ID is not configured. Please set NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID in your environment variables.',
    };
  }

  try {
    const url = 'https://eapi.phone.email/getuser';
    const formData = new FormData();
    formData.append('access_token', accessToken);
    formData.append('client_id', clientId);

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Phone.Email service error: HTTP ${res.status} (${res.statusText})`,
      };
    }

    const data: PhoneEmailUserData = await res.json();

    if (data.status !== 200 || !data.phone_no) {
      return {
        success: false,
        error: data.message || 'Phone verification failed or invalid access token.',
      };
    }

    const rawPhone = data.phone_no || '';
    const cleanMobile = rawPhone.replace(/\D/g, '').slice(-10);
    const countryCode = data.country_code || '+91';

    return {
      success: true,
      cleanMobile,
      countryCode,
      fullPhone: `${countryCode}${cleanMobile}`,
      jwt: data.ph_email_jwt,
    };
  } catch (err: any) {
    console.error('[Phone.Email] Server verification exception:', err);
    return {
      success: false,
      error: err?.message || 'Failed to communicate with Phone.Email verification gateway.',
    };
  }
}

/**
 * Direct fetch & verify from user_json_url emitted by Phone.Email web plugin
 * e.g. https://user.phone.email/user_ABC123.json
 */
export async function verifyPhoneEmailUserJson(userJsonUrl: string): Promise<VerifiedPhoneUser> {
  if (!userJsonUrl || typeof userJsonUrl !== 'string') {
    return { success: false, error: 'User JSON URL is required.' };
  }

  try {
    const parsed = new URL(userJsonUrl);
    if (!parsed.hostname.endsWith('phone.email')) {
      return { success: false, error: 'Invalid verification domain.' };
    }

    const res = await fetch(userJsonUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      // Fallback: If userJsonUrl fetch fails, extract token and try server-side exchange
      const tokenMatch = userJsonUrl.match(/user_([a-zA-Z0-9_\-]+)\.json/);
      if (tokenMatch && tokenMatch[1]) {
        return await verifyPhoneEmailToken(tokenMatch[1]);
      }
      return { success: false, error: `Failed to fetch verified user profile (HTTP ${res.status}).` };
    }

    const data = await res.json();
    const rawPhone = data.user_phone_number || data.phone_no || '';
    const cleanMobile = rawPhone.replace(/\D/g, '').slice(-10);
    const countryCode = data.user_country_code || data.country_code || '+91';

    if (!cleanMobile || cleanMobile.length !== 10) {
      return { success: false, error: 'Could not extract valid 10-digit mobile number.' };
    }

    const tokenMatch = userJsonUrl.match(/user_([a-zA-Z0-9_\-]+)\.json/);
    const jwt = tokenMatch ? tokenMatch[1] : undefined;

    return {
      success: true,
      cleanMobile,
      countryCode,
      fullPhone: `${countryCode}${cleanMobile}`,
      jwt,
    };
  } catch (err: any) {
    console.error('[Phone.Email] JSON fetch exception:', err);
    const tokenMatch = userJsonUrl.match(/user_([a-zA-Z0-9_\-]+)\.json/);
    if (tokenMatch && tokenMatch[1]) {
      return await verifyPhoneEmailToken(tokenMatch[1]);
    }
    return { success: false, error: err?.message || 'Error processing verification profile.' };
  }
}


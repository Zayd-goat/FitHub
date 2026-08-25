import { supabase } from './supabase';

export const AUTH_CONFIRM_REDIRECT = 'fithub://auth-confirmed';
export const PASSWORD_RESET_REDIRECT = 'fithub://reset-password';

type AuthLinkParams = Record<string, string>;

export function readAuthLinkParams(url: string): AuthLinkParams {
  const params: AuthLinkParams = {};
  const collect = (value: string) => {
    const query = value.replace(/^\?/, '').replace(/^#/, '');
    if (!query) return;
    new URLSearchParams(query).forEach((entry, key) => { params[key] = entry; });
  };
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  if (queryIndex >= 0) collect(url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined));
  if (hashIndex >= 0) collect(url.slice(hashIndex + 1));
  return params;
}

export function isPasswordRecoveryUrl(url: string) {
  const params = readAuthLinkParams(url);
  return url.startsWith(PASSWORD_RESET_REDIRECT) || params.type === 'recovery';
}

export async function establishAuthSessionFromUrl(url: string) {
  const params = readAuthLinkParams(url);
  if (params.error || params.error_code) {
    throw new Error(params.error_description || params.error || 'The email link is invalid or has expired.');
  }
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }
  if (!params.access_token || !params.refresh_token) return null;
  const { data, error } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (error) throw error;
  return data.session;
}

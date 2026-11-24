import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const cookieName = '__Host-donation-editor';
const maxAge = 30 * 24 * 60 * 60;
const digest = (value) => createHash('sha256').update(value).digest();
const signature = (payload, password) => createHmac('sha256', process.env.SESSION_SECRET || password).update('donation-editor-v1:' + payload).digest();
const editorPassword = () => {
  const password = process.env.EDIT_PASSWORD;
  if (password && process.env.SESSION_SECRET?.length >= 32) return password;
  return password?.length >= 24 ? password : null;
};

export function isEditor(request) {
  const password = editorPassword();
  const cookie = request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!password || !cookie || !/^\d{10}\.[\w-]{22}\.[\w-]{43}$/.test(cookie)) return false;
  const [expiry, nonce, encoded] = cookie.split('.');
  if (Number(expiry) <= Math.floor(Date.now() / 1000)) return false;
  const supplied = Buffer.from(encoded, 'base64url');
  return supplied.length === 32 && timingSafeEqual(supplied, signature(expiry + '.' + nonce, password));
}

export function startSession(candidate) {
  const password = editorPassword();
  if (!password) throw Object.assign(new Error('The editing password has not been configured.'), { status: 503 });
  if (typeof candidate !== 'string' || candidate.length > 512 || !timingSafeEqual(digest(candidate), digest(password))) return null;
  const expiry = Math.floor(Date.now() / 1000) + maxAge;
  const payload = expiry + '.' + randomBytes(16).toString('base64url');
  return cookieName + '=' + payload + '.' + signature(payload, password).toString('base64url') +
    '; Path=/; Max-Age=' + maxAge + '; Secure; HttpOnly; SameSite=Strict';
}

export const endSession = () => cookieName + '=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict';

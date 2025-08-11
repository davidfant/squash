export async function getAuthToken(): Promise<string | undefined> {
  const { authToken } = await chrome.storage.local.get("authToken");
  return typeof authToken === "string" ? authToken : undefined;
}

export async function getApiBase(): Promise<string | undefined> {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  return typeof apiBase === "string" ? apiBase : undefined;
}

export async function getAppUrl(): Promise<string | undefined> {
  const { appUrl } = await chrome.storage.local.get("appUrl");
  return typeof appUrl === "string" ? appUrl : undefined;
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export function decodeJwtPayload<T = any>(token: string): T | undefined {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) return undefined;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

export type BasicUserInfo = {
  email?: string;
  name?: string;
  id?: string;
  sub?: string;
};

export function getUserInfoFromToken(token: string): BasicUserInfo | undefined {
  const payload = decodeJwtPayload<any>(token);
  if (!payload) return undefined;
  // Try a few common shapes
  const user = payload.user ?? payload;
  return {
    email: user.email ?? payload.email,
    name: user.name ?? payload.name,
    id: user.id ?? payload.id,
    sub: payload.sub,
  } as BasicUserInfo;
}



export const BASEURL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  code: number;
  fullErrors: unknown[];
  customCode?: string;

  constructor(
    message: string,
    code: number,
    fullErrors: unknown[] = [],
    customCode?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fullErrors = fullErrors;
    this.customCode = customCode;
  }
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  let token: string | null = localStorage.getItem("customerToken");
  if (!token) {
    try {
      const raw = localStorage.getItem("veebeez-customer-auth");
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: { token?: string } };
        token = parsed.state?.token ?? null;
        if (token) localStorage.setItem("customerToken", token);
      }
    } catch {
      token = null;
    }
  }
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function buildUrl(path: string): string {
  const base = (BASEURL ?? "").replace(/\/$/, "");
  const clean = path.replace(/^\//, "");
  if (!base) return `/${clean}`;
  return `${base}/${clean}`;
}

let isAutoLoggingOut = false;

function triggerAutoLogout(res: Response) {
  if (typeof window === "undefined") return;
  // Avoid infinite loop when the 401 comes from the logout endpoint itself
  if (res.url?.includes("customer-auth/logout")) return;
  if (isAutoLoggingOut) return;
  isAutoLoggingOut = true;

  // Capture auth header before clearing so server logout can be authenticated
  const authHeader = getAuthHeader();

  // Synchronous localStorage cleanup (immediate)
  try {
    localStorage.removeItem("customerToken");
  } catch {}
  try {
    const raw = localStorage.getItem("veebeez-customer-auth");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
      if (parsed.state && "token" in parsed.state) {
        localStorage.setItem(
          "veebeez-customer-auth",
          JSON.stringify({ state: { token: null, user: null }, version: 0 }),
        );
      }
    }
  } catch {
    // ignore
  }

  // Clear zustand store – dynamic import avoids circular dependency on services
  void import("@/store/useCustomerAuthStore")
    .then(({ useCustomerAuthStore }) => {
      try {
        useCustomerAuthStore.getState().clearAuth();
      } catch {}
    })
    .catch(() => {});

  // Server-side logout via services/customer-auth-requests.ts (best-effort, ignore errors)
  // Dynamic import avoids circular dependency: services -> lib/https -> services
  void import("@/services/customer-auth-requests")
    .then(({ logoutCustomer }) => {
      // logoutCustomer internally uses PostRequest which would re-enter handleResponse,
      // but isAutoLoggingOut + url guard above prevents infinite recursion
      return logoutCustomer().catch(() => {});
    })
    .catch(() => {
      // Fallback: raw fetch if service import fails for any reason
      try {
        void fetch(buildUrl("customer-auth/logout"), {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...authHeader,
          },
        }).catch(() => {});
      } catch {}
    });

  // Allow future auto-logout after re-login
  setTimeout(() => {
    isAutoLoggingOut = false;
  }, 3000);
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (res.status === 401) {
    triggerAutoLogout(res);
  }

  if (!res.ok) {
    let body: unknown = null;
    if (isJson) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } else {
      try {
        body = await res.text();
      } catch {
        body = null;
      }
    }

    if (body && typeof body === "object" && "error" in (body as Record<string, unknown>)) {
      const err = (body as { error: { message?: string; code?: number; full_errors?: unknown[]; custom_code?: string } }).error;
      throw new ApiError(err.message ?? res.statusText, err.code ?? res.status, err.full_errors ?? [], err.custom_code);
    }

    throw new ApiError(
      typeof body === "string" && body.length > 0 ? body : res.statusText,
      res.status,
      [],
    );
  }

  if (res.status === 204) return undefined as T;
  if (!isJson) return (await res.text()) as unknown as T;
  return (await res.json()) as T;
}

export async function GetRequest<T = unknown>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...getAuthHeader(),
    },
  });
  return handleResponse<T>(res);
}

export async function PostRequest<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function PatchRequest<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function DeleteRequest<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function ModifiedPostRequest<T = unknown>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...getAuthHeader(),
    },
    body: formData,
  });
  return handleResponse<T>(res);
}

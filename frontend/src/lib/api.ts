const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const TOKEN_KEY = "stablehire_token";

function getToken(): string | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function getData<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Unable to load data");
  return response.json();
}

export async function uploadCsv(resource: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API_URL}/upload/${resource}`, {
    method: "POST",
    body,
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error((await response.json()).detail || "Upload failed");
  return response.json();
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: authHeaders(
      isFormData ? options?.headers : { "Content-Type": "application/json", ...options?.headers }
    ),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // FastAPI 422 returns detail as an array of validation error objects
    let msg: string;
    if (Array.isArray(data.detail)) {
      msg = data.detail.map((d: { msg?: string; loc?: string[] }) =>
        d.msg ? `${d.loc?.slice(1).join(" → ") ?? "field"}: ${d.msg}` : JSON.stringify(d)
      ).join("; ");
    } else {
      msg = data.detail || "Request failed";
    }
    throw new Error(msg);
  }
  return data;
}

export async function previewCsv(resource: "jobs" | "skills", file: File) {
  const body = new FormData();
  body.append("file", file);
  return request<{ rows: Record<string, string>[]; total: number; missing_columns: string[]; valid: boolean }>(
    `/upload/preview/${resource}`,
    { method: "POST", body }
  );
}

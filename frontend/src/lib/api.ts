const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function getData<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error("Unable to load data");
  return response.json();
}

export async function uploadCsv(resource: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API_URL}/upload/${resource}`, { method: "POST", body });
  if (!response.ok) throw new Error((await response.json()).detail || "Upload failed");
  return response.json();
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: options?.body instanceof FormData ? options.headers : { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export async function previewCsv(resource: "jobs" | "skills", file: File) {
  const body = new FormData(); body.append("file", file);
  return request<{ rows: Record<string, string>[]; total: number; missing_columns: string[]; valid: boolean }>(`/upload/preview/${resource}`, { method: "POST", body });
}

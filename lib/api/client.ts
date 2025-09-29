const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
import { getAuthToken } from "@/components/auth/token";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const { body, headers, ...rest } = init;
  const preparedHeaders = new Headers(headers ?? {});
  const token = getAuthToken?.();
if (token && !preparedHeaders.has("Authorization")) {
  preparedHeaders.set("Authorization", `Bearer ${token}`);}
  let finalBody: BodyInit | undefined;
  const shouldSerialize =
    body !== undefined &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof URLSearchParams) &&
    typeof body !== "string";

  if (shouldSerialize) {
    finalBody = JSON.stringify(body);
    if (!preparedHeaders.has("Content-Type")) {
      preparedHeaders.set("Content-Type", "application/json");
    }
  } else if (typeof body === "string") {
    finalBody = body;
    if (!preparedHeaders.has("Content-Type")) {
      preparedHeaders.set("Content-Type", "application/json");
    }
  } else {
    finalBody = body as BodyInit | undefined;
  }

  if (!preparedHeaders.has("Accept")) {
    preparedHeaders.set("Accept", "application/json");
  }

  const response = await fetch(url, {
    method: rest.method ?? (finalBody ? "POST" : "GET"),
    ...rest,
    headers: preparedHeaders,
    body: finalBody,
  });

  const text = await response.text();
  let data: unknown = undefined;

  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : response.statusText || "API request failed";
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

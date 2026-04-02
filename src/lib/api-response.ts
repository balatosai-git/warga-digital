/**
 * Standardized API Response Helpers
 *
 * Provides consistent response shapes across all API routes.
 * Replaces ad-hoc { error: "..." } and { message: "..." } patterns
 * with a unified format:
 *
 * Success: { success: true, data: T }
 * Error:   { success: false, error: { message: string, code?: string } }
 *
 * Usage:
 *   import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
 *
 *   return successResponse({ userId: "123" });
 *   return errorResponse("Invalid input", 400);
 *   return unauthorizedResponse();
 */

import { NextResponse } from "next/server";

// ─── Type Definitions ─────────────────────────────────────────────────────────

/** Standard error payload included in error responses. */
export interface ApiError {
  /** Human-readable error message in Indonesian or English */
  message: string;
  /** Optional machine-readable error code for frontend handling */
  code?: string;
}

/** Standard success response payload. */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/** Standard error response payload. */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/** Union type for all API responses. */
export type ApiResponse<T = unknown> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

// ─── Response Helpers ─────────────────────────────────────────────────────────

/**
 * Build a standardized success response.
 *
 * @param data - The response payload
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized success shape
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true, data },
    { status },
  );
}

/**
 * Build a standardized error response.
 *
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 500)
 * @param code - Optional machine-readable error code
 * @returns NextResponse with standardized error shape
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status },
  );
}

/**
 * Build a 400 Bad Request response.
 *
 * @param message - Error message explaining the validation failure
 * @param code - Optional error code (e.g. "VALIDATION_ERROR")
 */
export function badRequestResponse(
  message: string,
  code?: string,
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 400, code ?? "BAD_REQUEST");
}

/**
 * Build a 401 Unauthorized response.
 *
 * Used when the caller is not authenticated (missing or invalid session).
 */
export function unauthorizedResponse(
  message: string = "Anda harus masuk untuk melakukan tindakan ini.",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 401, "UNAUTHORIZED");
}

/**
 * Build a 403 Forbidden response.
 *
 * Used when the caller is authenticated but lacks permission.
 */
export function forbiddenResponse(
  message: string = "Anda tidak memiliki izin untuk melakukan tindakan ini.",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 403, "FORBIDDEN");
}

/**
 * Build a 404 Not Found response.
 */
export function notFoundResponse(
  message: string = "Data tidak ditemukan.",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 404, "NOT_FOUND");
}

/**
 * Build a 409 Conflict response.
 *
 * Used for duplicate entries (e.g. username already taken).
 */
export function conflictResponse(
  message: string,
  code?: string,
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 409, code ?? "CONFLICT");
}

/**
 * Build a 429 Too Many Requests response.
 *
 * Used when rate limit is exceeded.
 */
export function rateLimitResponse(
  message: string = "Terlalu banyak permintaan. Silakan coba lagi nanti.",
  retryAfterSeconds?: number,
): NextResponse<ApiErrorResponse> {
  const headers: Record<string, string> = {
    "X-RateLimit-Exceeded": "true",
  };
  if (retryAfterSeconds) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }
  return NextResponse.json(
    { success: false, error: { message, code: "RATE_LIMITED" } },
    { status: 429, headers },
  );
}

/**
 * Build a 500 Internal Server Error response.
 *
 * Use this for unexpected errors. The message is intentionally generic
 * to avoid leaking internal details.
 */
export function internalErrorResponse(
  message: string = "Terjadi kesalahan. Silakan coba lagi.",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 500, "INTERNAL_ERROR");
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

/**
 * Type guard to check if a response is a success response.
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error response.
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>,
): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Extract error message from an API response.
 * Returns null if the response is a success.
 */
export function getErrorMessage<T>(
  response: ApiResponse<T>,
): string | null {
  return isErrorResponse(response) ? response.error.message : null;
}

/**
 * Extract data from a success response.
 * Throws if the response is an error.
 */
export function getDataOrThrow<T>(response: ApiResponse<T>): T {
  if (isErrorResponse(response)) {
    throw new Error(response.error.message);
  }
  return response.data;
}

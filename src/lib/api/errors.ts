import { NextResponse } from "next/server";

/**
 * Standard error response shape across all API routes.
 *
 * All handlers under `src/app/api/v1/**` return this shape on failure so
 * clients have a single schema to parse. `code` is optional and is meant for
 * machine-readable discriminators (e.g. "RATE_LIMITED", "FORBIDDEN") when
 * the caller needs to branch on the reason; `message` is always
 * human-readable (Italian, per app convention).
 */
export type ApiErrorBody = {
  success: false;
  message: string;
  code?: string;
};

export function apiError(
  status: number,
  message: string,
  code?: string,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { success: false, message };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

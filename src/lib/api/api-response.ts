import { NextResponse } from "next/server";
import type { ApiFailure, ApiSuccess } from "@/lib/api/api-types";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>(
    {
      data,
      ok: true,
    },
    { status },
  );
}

export function apiError(code: string, message: string, status = 400) {
  const response = NextResponse.json<ApiFailure>(
    {
      error: {
        code,
        message,
      },
      ok: false,
    },
    { status },
  );

  if (status === 401) {
    response.headers.set("WWW-Authenticate", "Bearer");
  }

  return response;
}

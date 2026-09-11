import { NextResponse } from "next/server";

/** A validation/precondition failure that should surface to the client as 4xx. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Wraps a route handler so validation errors become clean 4xx responses and
 * anything unexpected becomes a 500 with a message the UI can display.
 */
export async function handle<T>(fn: () => Promise<T> | T) {
  try {
    const result = await fn();
    if (result === undefined || result === null) return noContent();
    return ok(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected server error";
    console.error("[api]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError("Request body must be a JSON object");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Request body must be valid JSON");
  }
}

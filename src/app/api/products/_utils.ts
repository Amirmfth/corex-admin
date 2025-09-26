import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message);
  }
}

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BadRequestError("Request body must be a JSON object");
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(", ");
    throw new BadRequestError(message);
  }

  return parsed.data;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }
  }

  console.error(error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}

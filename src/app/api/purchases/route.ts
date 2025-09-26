import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { createPurchase } from '../../../../lib/purchases';

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

function serverError(message = 'Unable to create purchase') {
  return NextResponse.json({ message }, { status: 500 });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  try {
    const purchase = await createPurchase(payload);
    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? 'Invalid purchase payload';
      return badRequest(message);
    }

    if (error instanceof TypeError) {
      return badRequest(error.message);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[purchases:create:prisma]', error);
      return serverError();
    }

    console.error('[purchases:create]', error);
    return serverError();
  }
}

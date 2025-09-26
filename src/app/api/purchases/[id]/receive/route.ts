import { NextResponse } from 'next/server';

import { receivePurchase } from '../../../../../../lib/purchases';

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

function notFound(message = 'Purchase not found') {
  return NextResponse.json({ message }, { status: 404 });
}

function serverError(message = 'Unable to receive purchase') {
  return NextResponse.json({ message }, { status: 500 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!id) {
    return badRequest('Purchase id is required');
  }

  try {
    const result = await receivePurchase(id);
    const status = result.alreadyReceived ? 200 : 201;

    return NextResponse.json(result, { status });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Purchase not found') {
        return notFound();
      }

      console.error('[purchases:receive]', error);
    }

    return serverError();
  }
}

import { NextResponse } from 'next/server';

import { getAlertsSummary } from '../../../../../lib/alerts';

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get('limit'));
  const summary = await getAlertsSummary({ limit });
  return NextResponse.json(summary);
}

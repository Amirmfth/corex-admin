import { NextResponse } from 'next/server';

import {
  appSettingsSchema,
  getAppSettings,
  sanitizeAppSettings,
  setAppSettings,
} from '../../../../lib/settings';

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = appSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid settings payload', issues: parsed.error.format() }, { status: 400 });
    }

    const saved = await setAppSettings(parsed.data);
    return NextResponse.json(sanitizeAppSettings(saved));
  } catch (error) {
    console.error('Failed to save settings', error);
    return NextResponse.json({ message: 'Unable to save settings' }, { status: 500 });
  }
}

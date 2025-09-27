import { NextResponse } from 'next/server';

import {
  ReportChannel,
  defaultFilters,
  getAvailableFilters,
  getReportsAggregates,
  serializeFilters,
} from '../../../../../lib/reporting-data';

function parseChannels(params: URLSearchParams, available: ReportChannel[]): ReportChannel[] {
  const allowed = new Set<ReportChannel>(available);
  const provided = params.getAll('channels[]') as ReportChannel[];
  const valid = provided.filter((channel) => allowed.has(channel));
  return valid.length > 0 ? valid : available;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const defaults = defaultFilters();
  const { channels: availableChannels } = getAvailableFilters();

  const startParam = params.get('from');
  const endParam = params.get('to');
  const categoryParam = params.get('categoryId');

  const startDate = startParam ? new Date(startParam) : defaults.startDate;
  const endDate = endParam ? new Date(endParam) : defaults.endDate;
  const selectedChannels = parseChannels(params, availableChannels);

  const filters = {
    startDate,
    endDate,
    channels: selectedChannels,
    category: categoryParam?.trim() ? categoryParam : null,
  } as const;

  const aggregates = getReportsAggregates(filters);

  return NextResponse.json({ filters: serializeFilters(filters), aggregates });
}

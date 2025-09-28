'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatToman } from '../../../lib/money';

export type MiniBarDatum = {
  label: string;
  value: number;
};

type SupportedLocale = 'fa' | 'en';

interface MiniBarChartProps {
  data: MiniBarDatum[];
  barColor?: string;
  locale: SupportedLocale;
  valueLabel?: string;
}

function formatCurrency(value: number, locale: SupportedLocale) {
  return formatToman(Math.round(value), locale === 'fa' ? 'fa-IR' : 'en-US');
}

export default function MiniBarChart({
  data,
  barColor = 'var(--accent)',
  locale,
  valueLabel,
}: MiniBarChartProps) {
  const isRTL = locale === 'fa';

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={isRTL ? 'horizontal' : 'horizontal'}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--surface-hover)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-strong)', fontSize: 12 }}
            reversed={isRTL}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-strong)', fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(Number(value), locale)}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-hover)' }}
            formatter={(value: unknown) => {
              const numericValue = typeof value === 'number' ? value : Number(value);
              return [formatCurrency(Number.isFinite(numericValue) ? numericValue : 0, locale), valueLabel ?? ''];
            }}
            labelFormatter={(label) => String(label ?? '')}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={barColor} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

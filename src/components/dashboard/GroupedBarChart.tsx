'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatToman } from '../../../lib/money';

export type GroupedDatum = {
  label: string;
  revenueT: number;
  costT: number;
  profitT: number;
};

type SupportedLocale = 'fa' | 'en';

interface GroupedBarChartProps {
  data: GroupedDatum[];
  locale: SupportedLocale;
  labels: {
    revenue: string;
    cost: string;
    profit: string;
    currency: string;
  };
}

function formatCurrency(value: number, locale: SupportedLocale) {
  return formatToman(Math.round(value), locale === 'fa' ? 'fa-IR' : 'en-US');
}

export default function GroupedBarChart({ data, locale, labels }: GroupedBarChartProps) {
  const isRTL = locale === 'fa';

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={8} reverseStackOrder={isRTL}>
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
            tickFormatter={(value) => formatCurrency(value, locale)}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-hover)' }}
            formatter={(value: number, key: string) => {
              const labelMap: Record<string, string> = {
                revenueT: labels.revenue,
                costT: labels.cost,
                profitT: labels.profit,
              };
              return [formatCurrency(value, locale), labelMap[key] ?? labels.currency];
            }}
            labelFormatter={(label) => label}
          />
          <Legend wrapperStyle={{ color: 'var(--muted-strong)' }} formatter={(value) => {
            const labelMap: Record<string, string> = {
              revenueT: labels.revenue,
              costT: labels.cost,
              profitT: labels.profit,
            };
            return labelMap[value] ?? value;
          }} />
          <Bar dataKey="revenueT" fill="var(--accent)" radius={[8, 8, 0, 0]} />
          <Bar dataKey="costT" fill="var(--neutral-400)" radius={[8, 8, 0, 0]} />
          <Bar dataKey="profitT" fill="#10b981" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart as RechartsScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  RechartsTooltipProps,
  RechartsXAxisProps,
  RechartsYAxisProps,
} from 'recharts';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { formatToman } from '../../../lib/money';

const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', year: '2-digit' };
const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

export type TooltipValueType = number | string;

function useChartFormatters() {
  const locale = useLocale();
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US';

  const compactNumber = useMemo(
    () =>
      new Intl.NumberFormat(intlLocale, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
    [intlLocale],
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(intlLocale, {
        style: 'percent',
        maximumFractionDigits: 1,
      }),
    [intlLocale],
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, DATE_FORMAT),
    [intlLocale],
  );

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, MONTH_FORMAT),
    [intlLocale],
  );

  return {
    intlLocale: intlLocale as 'fa-IR' | 'en-US',
    compactNumber,
    percentFormatter,
    dateFormatter,
    monthFormatter,
    tomanFormatter: (value: number) => formatToman(Math.round(value), intlLocale as 'fa-IR' | 'en-US'),
  };
}

export function CurrencyYAxis(props: RechartsYAxisProps) {
  const { compactNumber } = useChartFormatters();
  return <YAxis {...props} tickFormatter={(value) => compactNumber.format(Number(value))} />;
}

export function PercentYAxis(props: RechartsYAxisProps) {
  const { percentFormatter } = useChartFormatters();
  return <YAxis {...props} tickFormatter={(value) => percentFormatter.format(Number(value))} />;
}

export type DateXAxisProps = RechartsXAxisProps & {
  variant?: 'date' | 'month';
};

export function DateXAxis({ variant = 'date', ...props }: DateXAxisProps) {
  const { dateFormatter, monthFormatter } = useChartFormatters();
  return (
    <XAxis
      {...props}
      tickFormatter={(value) => {
        if (value == null) return '';
        const dateValue = new Date(String(value));
        return variant === 'month' ? monthFormatter.format(dateValue) : dateFormatter.format(dateValue);
      }}
    />
  );
}

export type CurrencyTooltipProps = RechartsTooltipProps<number, string> & {
  variant?: 'date' | 'month';
};

export function CurrencyTooltip({ variant = 'date', ...props }: CurrencyTooltipProps) {
  const { dateFormatter, monthFormatter, tomanFormatter } = useChartFormatters();

  return (
    <Tooltip
      {...props}
      formatter={(value, name) => {
        const numericValue = typeof value === 'number' ? value : Number(value);
        const label = typeof name === 'string' ? name : String(name ?? '');
        return [tomanFormatter(Number.isFinite(numericValue) ? numericValue : 0), label];
      }}
      labelFormatter={(value) => {
        if (value == null) return '';
        const dateValue = new Date(String(value));
        return variant === 'month' ? monthFormatter.format(dateValue) : dateFormatter.format(dateValue);
      }}
    />
  );
}

export type PercentTooltipProps = RechartsTooltipProps<number, string>;

export function PercentTooltip(props: PercentTooltipProps) {
  const { percentFormatter } = useChartFormatters();
  return (
    <Tooltip
      {...props}
      formatter={(value, name) => {
        const numericValue = typeof value === 'number' ? value : Number(value);
        const label = typeof name === 'string' ? name : String(name ?? '');
        return [percentFormatter.format(Number.isFinite(numericValue) ? numericValue : 0), label];
      }}
    />
  );
}

export {
  ResponsiveContainer,
  RechartsBarChart as BarChart,
  Bar,
  RechartsLineChart as LineChart,
  Line,
  RechartsPieChart as PieChart,
  Pie,
  Cell,
  RechartsScatterChart as ScatterChart,
  Scatter,
  CartesianGrid,
  Legend,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
};

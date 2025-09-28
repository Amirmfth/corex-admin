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
  YAxisProps,
  XAxisProps,
  TooltipProps,
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
    tomanFormatter: (value: number) =>
      formatToman(Math.round(value), intlLocale as 'fa-IR' | 'en-US'),
  };
}

export function CurrencyYAxis(props: YAxisProps) {
  const { compactNumber } = useChartFormatters();
  return <YAxis {...props} tickFormatter={(value) => compactNumber.format(Number(value))} />;
}

export function PercentYAxis(props: YAxisProps) {
  const { percentFormatter } = useChartFormatters();
  return <YAxis {...props} tickFormatter={(value) => percentFormatter.format(Number(value))} />;
}

export type DateXAxisProps = XAxisProps & {
  variant?: 'date' | 'month';
};

export function DateXAxis({ variant = 'date', ...props }: DateXAxisProps) {
  const { dateFormatter, monthFormatter } = useChartFormatters();
  return (
    <XAxis
      {...props}
      tickFormatter={(value: TooltipValueType) => {
        if (!value) return '';
        const dateValue = new Date(String(value));
        return variant === 'month'
          ? monthFormatter.format(dateValue)
          : dateFormatter.format(dateValue);
      }}
    />
  );
}

export type CurrencyTooltipProps = TooltipProps<number, string> & {
  variant?: 'date' | 'month';
};

export function CurrencyTooltip({ variant = 'date', ...props }: CurrencyTooltipProps) {
  const { dateFormatter, monthFormatter, tomanFormatter } = useChartFormatters();

  return (
    <Tooltip
      {...props}
      formatter={(value: TooltipValueType, name) => [tomanFormatter(Number(value)), name]}
      labelFormatter={(value) => {
        if (!value) return '';
        const dateValue = new Date(String(value));
        return variant === 'month'
          ? monthFormatter.format(dateValue)
          : dateFormatter.format(dateValue);
      }}
    />
  );
}

export type PercentTooltipProps = TooltipProps<number, string>;

export function PercentTooltip(props: PercentTooltipProps) {
  const { percentFormatter } = useChartFormatters();
  return (
    <Tooltip
      {...props}
      formatter={(value: TooltipValueType, name) => [percentFormatter.format(Number(value)), name]}
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

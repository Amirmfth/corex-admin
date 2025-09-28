import { Children, isValidElement } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

// Shared helpers

type Length = number | string;

type DataAccessor<TEntry> = (entry: TEntry, index: number) => unknown;

type BaseProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
};

type StubComponent<P = Record<string, unknown>> = ((props: P) => ReactElement | null) & {
  __rechartsRole: string;
  displayName?: string;
};

function createStub<P = Record<string, unknown>>(role: string): StubComponent<P> {
  const Component = ((_props: P) => null) as StubComponent<P>;
  Component.__rechartsRole = role;
  Component.displayName = `Recharts${role}`;
  return Component;
}

function formatLength(length?: Length): string | undefined {
  if (length == null) {
    return undefined;
  }
  if (typeof length === 'number') {
    return `${length}px`;
  }
  return length;
}

function createDataAccessor<TEntry>(dataKey: unknown): DataAccessor<TEntry> {
  if (typeof dataKey === 'function') {
    return (entry: TEntry, index: number) => {
      try {
        return dataKey(entry, index);
      } catch {
        return undefined;
      }
    };
  }

  if (typeof dataKey === 'number') {
    return (entry: TEntry) => (entry as Record<number, unknown>)?.[dataKey];
  }

  if (typeof dataKey === 'string') {
    const segments = dataKey.split('.');
    return (entry: TEntry) =>
      segments.reduce<unknown>((acc, segment) => {
        if (acc == null) return undefined;
        if (typeof acc === 'object' || typeof acc === 'function') {
          return (acc as Record<string, unknown>)[segment];
        }
        return undefined;
      }, entry as unknown);
  }

  if (typeof dataKey === 'symbol') {
    return (entry: TEntry) => (entry as Record<symbol, unknown>)?.[dataKey];
  }

  if (dataKey != null) {
    return (entry: TEntry) => (entry as Record<PropertyKey, unknown>)?.[dataKey as PropertyKey];
  }

  return (_entry: TEntry, index: number) => index + 1;
}

function toArray(children: ReactNode): ReactNode[] {
  return Children.toArray(children ?? []);
}

function collectElementsByRole(children: ReactNode, role: string): ReactElement[] {
  return toArray(children).flatMap((child) => {
    if (!isValidElement(child)) {
      return [];
    }
    const elementType = child.type as { __rechartsRole?: string };
    if (elementType?.__rechartsRole === role) {
      return [child];
    }
    return [];
  });
}

function pickFirstElementByRole(children: ReactNode, role: string): ReactElement | undefined {
  return collectElementsByRole(children, role)[0];
}

function formatValue(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '—';
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => formatValue(entry)).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object]';
    }
  }
  return String(value);
}

const shellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  justifyContent: 'center',
  gap: '0.75rem',
  height: '100%',
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.75rem',
  borderRadius: '0.75rem',
  background: 'var(--surface-muted, rgba(148, 163, 184, 0.08))',
  border: '1px dashed var(--border, rgba(148, 163, 184, 0.4))',
};

const titleStyle: CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--muted-strong, #475569)',
  fontWeight: 600,
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.75rem',
  color: 'var(--foreground, #0f172a)',
};

const headerCellStyle: CSSProperties = {
  textAlign: 'left',
  fontWeight: 600,
  padding: '0.25rem 0.5rem',
  borderBottom: '1px solid var(--border, rgba(148, 163, 184, 0.4))',
};

const cellStyle: CSSProperties = {
  padding: '0.25rem 0.5rem',
  borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  whiteSpace: 'nowrap',
};

interface SummaryColumn<TEntry> {
  key: string;
  label: string;
  resolver: DataAccessor<TEntry>;
  color?: string;
}

interface ChartSummaryProps<TEntry> extends BaseProps {
  role: string;
  data: TEntry[];
  resolveLabel: DataAccessor<TEntry>;
  labelHeader?: string;
  columns: SummaryColumn<TEntry>[];
  emptyLabel?: string;
}

function ChartSummary<TEntry>({
  role,
  data,
  resolveLabel,
  labelHeader = 'Label',
  columns,
  emptyLabel = 'No data available',
  className,
  style,
}: ChartSummaryProps<TEntry>) {
  return (
    <div className={className} style={{ ...style, position: 'relative' }} data-recharts-role={role} data-recharts-stub="true">
      <div style={shellStyle}>
        <p style={titleStyle}>{`Interactive ${role} preview is unavailable in this build.`}</p>
        {data.length === 0 || columns.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>{emptyLabel}</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>{labelHeader}</th>
                {columns.map((column) => (
                  <th key={column.key} style={headerCellStyle}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((entry, index) => (
                <tr key={index}>
                  <td style={cellStyle}>{formatValue(resolveLabel(entry, index))}</td>
                  {columns.map((column) => (
                    <td key={column.key} style={{ ...cellStyle, color: column.color ?? cellStyle.color }}>
                      {formatValue(column.resolver(entry, index))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function getSeriesLabel(props: Record<string, unknown>, fallback: string): string {
  const explicit = props.name;
  if (typeof explicit === 'string' && explicit.trim().length > 0) {
    return explicit;
  }
  const key = props.dataKey;
  if (typeof key === 'string') {
    return key;
  }
  if (typeof key === 'number') {
    return `Series ${key}`;
  }
  return fallback;
}

function getLabelHeader(props: Record<string, unknown> | undefined): string {
  if (!props) return 'Label';
  const header = props.name ?? props.dataKey;
  if (typeof header === 'string' && header.trim().length > 0) {
    return header;
  }
  return 'Label';
}

// Component exports

export interface ResponsiveContainerProps extends BaseProps {
  width?: Length;
  height?: Length;
  minWidth?: Length;
  minHeight?: Length;
  aspect?: number;
  debounce?: number;
}

export function ResponsiveContainer({
  width = '100%',
  height = '100%',
  minWidth,
  minHeight,
  aspect,
  children,
  className,
  style,
}: ResponsiveContainerProps) {
  const resolved: CSSProperties = {
    width: formatLength(width),
    height: formatLength(height),
    minWidth: formatLength(minWidth),
    minHeight: formatLength(minHeight),
  };

  if (aspect && aspect > 0) {
    resolved.aspectRatio = `${aspect}`;
  }

  return (
    <div className={className} style={{ ...resolved, ...style }}>
      {children}
    </div>
  );
}

export interface BarChartProps<TEntry = Record<string, unknown>> extends BaseProps {
  data?: TEntry[];
}

export function BarChart<TEntry = Record<string, unknown>>({ data, children, className, style }: BarChartProps<TEntry>) {
  const dataset = Array.isArray(data) ? data : [];
  const xAxis = pickFirstElementByRole(children, 'XAxis');
  const xAxisProps = (xAxis?.props ?? {}) as Record<string, unknown>;
  const labelAccessor = createDataAccessor<TEntry>(xAxisProps.dataKey);
  const labelHeader = getLabelHeader(xAxisProps);

  const barElements = collectElementsByRole(children, 'Bar');
  const columns: SummaryColumn<TEntry>[] = barElements.map((element, index) => {
    const elementProps = (element.props ?? {}) as Record<string, unknown>;
    const accessor = createDataAccessor<TEntry>(elementProps.dataKey);
    return {
      key: `bar-${index}`,
      label: getSeriesLabel(elementProps, `Series ${index + 1}`),
      resolver: accessor,
      color: (elementProps.fill ?? elementProps.stroke) as string | undefined,
    };
  });

  return (
    <ChartSummary
      role="BarChart"
      data={dataset}
      resolveLabel={labelAccessor}
      labelHeader={labelHeader}
      columns={columns}
      className={className}
      style={style}
    />
  );
}

export interface LineChartProps<TEntry = Record<string, unknown>> extends BaseProps {
  data?: TEntry[];
}

export function LineChart<TEntry = Record<string, unknown>>({ data, children, className, style }: LineChartProps<TEntry>) {
  const dataset = Array.isArray(data) ? data : [];
  const xAxis = pickFirstElementByRole(children, 'XAxis');
  const xAxisProps = (xAxis?.props ?? {}) as Record<string, unknown>;
  const labelAccessor = createDataAccessor<TEntry>(xAxisProps.dataKey);
  const labelHeader = getLabelHeader(xAxisProps);

  const lineElements = collectElementsByRole(children, 'Line');
  const columns: SummaryColumn<TEntry>[] = lineElements.map((element, index) => {
    const elementProps = (element.props ?? {}) as Record<string, unknown>;
    const accessor = createDataAccessor<TEntry>(elementProps.dataKey);
    return {
      key: `line-${index}`,
      label: getSeriesLabel(elementProps, `Series ${index + 1}`),
      resolver: accessor,
      color: (elementProps.stroke ?? elementProps.fill) as string | undefined,
    };
  });

  return (
    <ChartSummary
      role="LineChart"
      data={dataset}
      resolveLabel={labelAccessor}
      labelHeader={labelHeader}
      columns={columns}
      className={className}
      style={style}
    />
  );
}

export interface ScatterChartProps<TEntry = Record<string, unknown>> extends BaseProps {
  data?: TEntry[];
}

export function ScatterChart<TEntry = Record<string, unknown>>({
  children,
  className,
  style,
  data,
}: ScatterChartProps<TEntry>) {
  const scatterElement = pickFirstElementByRole(children, 'Scatter');
  const scatterProps = (scatterElement?.props ?? {}) as Record<string, unknown>;
  const dataset = Array.isArray(scatterProps.data)
    ? (scatterProps.data as TEntry[])
    : Array.isArray(data)
      ? data
      : [];

  const xAxis = pickFirstElementByRole(children, 'XAxis');
  const yAxis = pickFirstElementByRole(children, 'YAxis');
  const xAxisProps = (xAxis?.props ?? {}) as Record<string, unknown>;
  const yAxisProps = (yAxis?.props ?? {}) as Record<string, unknown>;
  const labelHeader = getLabelHeader(xAxisProps);
  const labelAccessor = createDataAccessor<TEntry>(xAxisProps.dataKey);

  const yAccessor = createDataAccessor<TEntry>(yAxisProps.dataKey);
  const yLabel = getSeriesLabel(
    yAxisProps,
    yAxisProps.dataKey ? String(yAxisProps.dataKey) : 'Value',
  );

  const extraColumns: SummaryColumn<TEntry>[] = [
    {
      key: 'y-axis',
      label: yLabel,
      resolver: yAccessor,
      color: 'var(--accent, #2563eb)',
    },
  ];

  const tooltip = pickFirstElementByRole(children, 'Tooltip');
  const tooltipProps = (tooltip?.props ?? {}) as Record<string, unknown>;
  const tooltipFormatter = tooltipProps.formatter as
    | ((value: unknown, name: unknown, payload: unknown, index: number) => unknown)
    | undefined;
  const tooltipLabelFormatter = tooltipProps.labelFormatter as
    | ((label: unknown, payload: unknown) => unknown)
    | undefined;
  if (tooltipFormatter || tooltipLabelFormatter) {
    extraColumns.push({
      key: 'tooltip',
      label: 'Details',
      resolver: (entry: TEntry, index: number) => {
        if (tooltipFormatter) {
          const result = tooltipFormatter(yAccessor(entry, index), yLabel, { payload: entry }, index);
          if (Array.isArray(result)) {
            return result[0];
          }
          return result;
        }
        if (tooltipLabelFormatter) {
          return tooltipLabelFormatter(index, entry);
        }
        return undefined;
      },
    });
  }

  return (
    <ChartSummary
      role="ScatterChart"
      data={dataset}
      resolveLabel={labelAccessor}
      labelHeader={labelHeader}
      columns={extraColumns}
      className={className}
      style={style}
    />
  );
}

export interface PieChartProps<TEntry = Record<string, unknown>> extends BaseProps {
  data?: TEntry[];
}

export function PieChart<TEntry = Record<string, unknown>>({
  children,
  className,
  style,
  data,
}: PieChartProps<TEntry>) {
  const pieElement = pickFirstElementByRole(children, 'Pie');
  const pieProps = (pieElement?.props ?? {}) as Record<string, unknown>;
  const dataset: TEntry[] = Array.isArray(pieProps.data)
    ? (pieProps.data as TEntry[])
    : Array.isArray(data)
      ? data
      : [];
  const valueAccessor = createDataAccessor(pieProps.dataKey);
  const nameAccessor = createDataAccessor(pieProps.nameKey ?? 'name');

  const cellElements = collectElementsByRole(pieProps.children as ReactNode, 'Cell');
  const listStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '0.5rem 1.25rem',
    fontSize: '0.75rem',
    color: 'var(--foreground, #0f172a)',
  };

  const chipStyle: CSSProperties = {
    width: '0.75rem',
    height: '0.75rem',
    borderRadius: '9999px',
    display: 'inline-block',
    marginRight: '0.5rem',
  };

  return (
    <div className={className} style={{ ...style, position: 'relative' }} data-recharts-role="PieChart" data-recharts-stub="true">
      <div style={shellStyle}>
        <p style={titleStyle}>Interactive PieChart preview is unavailable in this build.</p>
        {dataset.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>No data available</p>
        ) : (
          <div style={listStyle}>
            {dataset.map((entry, index) => {
              const cellProps = (cellElements[index]?.props ?? {}) as Record<string, unknown>;
              const color = (cellProps.fill as string | undefined) ?? 'var(--accent, #2563eb)';
              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{ ...chipStyle, background: color }} aria-hidden />
                    {formatValue(nameAccessor(entry, index))}
                  </span>
                  <span>{formatValue(valueAccessor(entry, index))}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Primitive chart elements

type DataKey<TEntry> = string | number | symbol | ((entry: TEntry, index: number) => unknown);

export interface BarProps<TEntry = Record<string, unknown>> {
  dataKey?: DataKey<TEntry>;
  name?: string;
  fill?: string;
  stackId?: string;
  radius?: unknown;
  cursor?: string;
  onClick?: (payload: unknown) => void;
  children?: ReactNode;
}

export const Bar = createStub<BarProps>('Bar');

export interface LineProps<TEntry = Record<string, unknown>> {
  dataKey?: DataKey<TEntry>;
  name?: string;
  stroke?: string;
  fill?: string;
  type?: string;
  strokeWidth?: number;
  dot?: boolean;
  onClick?: (payload: unknown) => void;
  children?: ReactNode;
}

export const Line = createStub<LineProps>('Line');

export interface PieProps<TEntry = Record<string, unknown>> {
  data?: TEntry[];
  dataKey?: DataKey<TEntry>;
  nameKey?: DataKey<TEntry>;
  innerRadius?: number;
  outerRadius?: number;
  children?: ReactNode;
}

export const Pie = createStub<PieProps>('Pie');

export interface ScatterProps<TEntry = Record<string, unknown>> {
  data?: TEntry[];
  dataKey?: DataKey<TEntry>;
  shape?: ReactNode | ((props: Record<string, unknown>) => ReactNode);
  onClick?: (payload: unknown) => void;
  children?: ReactNode;
}

export const Scatter = createStub<ScatterProps>('Scatter');

export interface CellProps {
  fill?: string;
  stroke?: string;
  children?: ReactNode;
}

export const Cell = createStub<CellProps>('Cell');

export interface LabelListProps<TEntry = Record<string, unknown>> {
  dataKey?: DataKey<TEntry>;
  position?: string;
  formatter?: (value: unknown, entry: TEntry, index: number) => unknown;
  children?: ReactNode;
}

export const LabelList = createStub<LabelListProps>('LabelList');

export interface CartesianGridProps extends BaseProps {
  strokeDasharray?: string;
  stroke?: string;
}

export const CartesianGrid = createStub<CartesianGridProps>('CartesianGrid');

export interface LegendProps extends BaseProps {
  formatter?: (value: string, entry?: unknown, index?: number) => ReactNode;
}

export const Legend = createStub<LegendProps>('Legend');

export type TooltipFormatter<TValue = unknown, TName = unknown> = (
  value: TValue,
  name: TName,
  payload: unknown,
  index: number
) => ReactNode | [ReactNode, ReactNode];

export interface TooltipProps<TValue = unknown, TName = unknown> extends BaseProps {
  formatter?: TooltipFormatter<TValue, TName>;
  labelFormatter?: (label: unknown, payload?: unknown) => ReactNode;
  cursor?: unknown;
}

export const Tooltip = createStub<TooltipProps>('Tooltip');

export interface XAxisProps<TEntry = Record<string, unknown>> extends BaseProps {
  dataKey?: DataKey<TEntry>;
  name?: string;
  type?: 'number' | 'category';
  tickFormatter?: (value: unknown) => ReactNode;
  reversed?: boolean;
  tick?: unknown;
  axisLine?: boolean;
  tickLine?: boolean;
}

export const XAxis = createStub<XAxisProps>('XAxis');

export interface YAxisProps<TEntry = Record<string, unknown>> extends BaseProps {
  dataKey?: DataKey<TEntry>;
  name?: string;
  type?: 'number' | 'category';
  tickFormatter?: (value: unknown) => ReactNode;
  tick?: unknown;
  axisLine?: boolean;
  tickLine?: boolean;
}

export const YAxis = createStub<YAxisProps>('YAxis');

export type { TooltipProps as RechartsTooltipProps, XAxisProps as RechartsXAxisProps, YAxisProps as RechartsYAxisProps };

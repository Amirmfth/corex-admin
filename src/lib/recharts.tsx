'use client';

import React, {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type TooltipProps = {
  formatter?: (value: number, name: string) => [string, string] | string;
  labelFormatter?: (label: string) => string;
  cursor?: { fill?: string };
};

type LegendProps = {
  formatter?: (value: string) => string;
  wrapperStyle?: React.CSSProperties;
};

type AxisTickFormatter = (value: number | string) => string;

type XAxisProps = {
  dataKey: string;
  reversed?: boolean;
  tickFormatter?: AxisTickFormatter;
};

type YAxisProps = {
  tickFormatter?: AxisTickFormatter;
};

type CartesianGridProps = {
  stroke?: string;
  strokeDasharray?: string;
};

type BarProps = {
  dataKey: string;
  fill?: string;
  radius?: [number, number, number, number];
};

type BarChartProps = {
  data: Record<string, number | string | null>[];
  chartWidth?: number;
  chartHeight?: number;
  barGap?: number;
  children: React.ReactNode;
};

type ResponsiveContainerProps = {
  width: string | number;
  height: string | number;
  children: React.ReactElement;
};

type TooltipState = {
  x: number;
  y: number;
  label: string;
  values: { name: string; value: number; formatted: string; fill: string }[];
};

const ResponsiveContext = React.createContext<{ width: number; height: number } | null>(null);

export function ResponsiveContainer({ width, height, children }: ResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: nextWidth, height: nextHeight } = entry.contentRect;
        setSize({ width: nextWidth, height: nextHeight });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style: React.CSSProperties = {
    position: 'relative',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div ref={containerRef} style={style}>
      {size.width > 0 && size.height > 0 ? (
        <ResponsiveContext.Provider value={size}>
          {cloneElement(children, { chartWidth: size.width, chartHeight: size.height })}
        </ResponsiveContext.Provider>
      ) : null}
    </div>
  );
}

const InternalBar: React.FC<BarProps> & { displayName?: string } = () => null;
InternalBar.displayName = 'RechartsBar';
export const Bar = InternalBar;

const InternalXAxis: React.FC<XAxisProps> & { displayName?: string } = () => null;
InternalXAxis.displayName = 'RechartsXAxis';
export const XAxis = InternalXAxis;

const InternalYAxis: React.FC<YAxisProps> & { displayName?: string } = () => null;
InternalYAxis.displayName = 'RechartsYAxis';
export const YAxis = InternalYAxis;

const InternalGrid: React.FC<CartesianGridProps> & { displayName?: string } = () => null;
InternalGrid.displayName = 'RechartsGrid';
export const CartesianGrid = InternalGrid;

const InternalTooltip: React.FC<TooltipProps> & { displayName?: string } = () => null;
InternalTooltip.displayName = 'RechartsTooltip';
export const Tooltip = InternalTooltip;

const InternalLegend: React.FC<LegendProps> & { displayName?: string } = () => null;
InternalLegend.displayName = 'RechartsLegend';
export const Legend = InternalLegend;

function useResponsiveSize(chartWidth?: number, chartHeight?: number) {
  const context = React.useContext(ResponsiveContext);
  if (context) {
    return context;
  }
  return { width: chartWidth ?? 0, height: chartHeight ?? 0 };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function BarChart({ data, chartWidth, chartHeight, children, barGap = 8 }: BarChartProps) {
  const { width, height } = useResponsiveSize(chartWidth, chartHeight);

  const { bars, xAxis, yAxis, grid, tooltipProps, legendProps } = useMemo(() => {
    const result = {
      bars: [] as BarProps[],
      xAxis: { dataKey: 'label', reversed: false, tickFormatter: undefined } as XAxisProps,
      yAxis: { tickFormatter: undefined } as YAxisProps,
      grid: null as CartesianGridProps | null,
      tooltipProps: null as TooltipProps | null,
      legendProps: null as LegendProps | null,
    };

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const displayName = (child.type as any).displayName;
      switch (displayName) {
        case 'RechartsBar':
          result.bars.push(child.props as BarProps);
          break;
        case 'RechartsXAxis':
          result.xAxis = { ...result.xAxis, ...(child.props as XAxisProps) };
          break;
        case 'RechartsYAxis':
          result.yAxis = { ...result.yAxis, ...(child.props as YAxisProps) };
          break;
        case 'RechartsGrid':
          result.grid = child.props as CartesianGridProps;
          break;
        case 'RechartsTooltip':
          result.tooltipProps = child.props as TooltipProps;
          break;
        case 'RechartsLegend':
          result.legendProps = child.props as LegendProps;
          break;
        default:
          break;
      }
    });

    return result;
  }, [children]);

  const barsToRender = bars.length > 0 ? bars : [{ dataKey: 'value', fill: 'var(--accent)' }];

  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [] as typeof data;
    }
    if (!xAxis.reversed) {
      return data;
    }
    return [...data].reverse();
  }, [data, xAxis.reversed]);

  const values = processedData.flatMap((entry) =>
    barsToRender.map((bar) => Number(entry[bar.dataKey] ?? 0)),
  );
  const maxValue = Math.max(0, ...values, 0);
  const minValue = Math.min(0, ...values, 0);
  const margin = { top: 24, right: 24, bottom: 36, left: 48 };
  const legendHeight = legendProps ? 32 : 0;
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  const innerHeight = Math.max(height - margin.top - margin.bottom - legendHeight, 0);
  const domainSpan = maxValue - minValue || 1;

  const scaleY = (value: number) => {
    const ratio = (value - minValue) / domainSpan;
    return innerHeight - ratio * innerHeight;
  };

  const zeroY = clamp(scaleY(0), 0, innerHeight);
  const groups = processedData.length;
  const groupWidth = groups > 0 ? innerWidth / groups : innerWidth;
  const effectiveGap = barsToRender.length > 1 ? barGap : 0;
  const barSlotWidth =
    barsToRender.length > 0
      ? Math.max((groupWidth - effectiveGap * (barsToRender.length - 1)) / barsToRender.length, 6)
      : groupWidth;

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleLeave = () => setTooltip(null);

  const axisLabels = processedData.map((entry) => {
    const key = xAxis.dataKey ?? 'label';
    const label = entry[key] ?? '';
    return typeof label === 'number' || typeof label === 'string' ? label : '';
  });

  const formatAxisValue = (
    formatter: AxisTickFormatter | undefined,
    value: number | string,
  ) => {
    if (!formatter) return value.toString();
    return formatter(value);
  };

  const yTicks = 4;
  const yValues = Array.from({ length: yTicks + 1 }, (_, index) =>
    minValue + ((maxValue - minValue) / yTicks) * index,
  );

  const legend = legendProps
    ? () => {
        const format = legendProps?.formatter ?? ((value: string) => value);
        return (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              paddingTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--muted-strong)',
              ...(legendProps?.wrapperStyle ?? {}),
            }}
          >
            {barsToRender.map((bar) => (
              <span
                key={bar.dataKey}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span
                  style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '0.2rem',
                    backgroundColor: bar.fill ?? 'var(--accent)',
                  }}
                />
                {format(bar.dataKey)}
              </span>
            ))}
          </div>
        );
      }
    : null;

  const handleEnter = (
    groupIndex: number,
    event: React.MouseEvent<SVGRectElement>,
    label: string,
  ) => {
    const payload = barsToRender.map((bar) => {
      const raw = Number(processedData[groupIndex]?.[bar.dataKey] ?? 0);
      const formatted = tooltipProps?.formatter
        ? tooltipProps.formatter(raw, bar.dataKey)
        : raw.toString();
      const normalizedValue = Array.isArray(formatted) ? formatted[0] : formatted;
      const labelName = Array.isArray(formatted) && formatted[1] ? formatted[1] : bar.dataKey;
      return {
        name: labelName,
        value: raw,
        formatted: normalizedValue,
        fill: bar.fill ?? 'var(--accent)',
      };
    });

    const svgRect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const offsetX = event.clientX - svgRect.left;
    const offsetY = event.clientY - svgRect.top;
    const labelText = tooltipProps?.labelFormatter
      ? tooltipProps.labelFormatter(label)
      : label;
    setTooltip({
      x: offsetX,
      y: offsetY,
      label: labelText,
      values: payload,
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width={width} height={height} role="img" onMouseLeave={handleLeave}>
        <g transform={`translate(48,24)`}>
          {grid
            ? yValues.map((tickValue, index) => {
                const y = scaleY(tickValue);
                return (
                  <line
                    key={`grid-${index}`}
                    x1={0}
                    y1={y}
                    x2={innerWidth}
                    y2={y}
                    stroke={grid.stroke ?? 'var(--surface-hover)'}
                    strokeDasharray={grid.strokeDasharray}
                  />
                );
              })
            : null}

          <line x1={0} y1={zeroY} x2={innerWidth} y2={zeroY} stroke="var(--muted-strong)" strokeWidth={0.5} />
          <line x1={0} y1={0} x2={0} y2={innerHeight} stroke="var(--muted-strong)" strokeWidth={0.5} />

          {axisLabels.map((label, groupIndex) => {
            const xOffset = groupWidth * groupIndex + groupWidth / 2;
            return (
              <text
                key={`x-${groupIndex}`}
                x={xOffset}
                y={innerHeight + 20}
                textAnchor="middle"
                fill="var(--muted-strong)"
                fontSize={12}
              >
                {formatAxisValue(xAxis.tickFormatter, label)}
              </text>
            );
          })}

          {yValues.map((value, index) => {
            const y = scaleY(value);
            return (
              <text
                key={`y-${index}`}
                x={-8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--muted-strong)"
                fontSize={11}
              >
                {formatAxisValue(yAxis.tickFormatter, Number(value.toFixed(0)))}
              </text>
            );
          })}

          {processedData.map((entry, groupIndex) => {
            const groupX = groupWidth * groupIndex +
              (groupWidth - (barSlotWidth * barsToRender.length + effectiveGap * (barsToRender.length - 1))) / 2;
            const rawLabel = entry[xAxis.dataKey ?? 'label'];
            const label =
              typeof rawLabel === 'string' || typeof rawLabel === 'number' ? String(rawLabel) : '';

            return barsToRender.map((bar, barIndex) => {
              const value = Number(entry[bar.dataKey] ?? 0);
              const barHeight = Math.abs(scaleY(value) - zeroY);
              const x = groupX + (barSlotWidth + effectiveGap) * barIndex;
              const y = value >= 0 ? scaleY(value) : zeroY;
              const radius = bar.radius ?? [0, 0, 0, 0];

              return (
                <rect
                  key={`${groupIndex}-${bar.dataKey}`}
                  x={clamp(x, 0, innerWidth)}
                  y={clamp(y, 0, innerHeight)}
                  width={Math.max(barSlotWidth, 4)}
                  height={Math.max(barHeight, 2)}
                  rx={radius[0] ?? 0}
                  ry={radius[1] ?? 0}
                  fill={bar.fill ?? 'var(--accent)'}
                  onMouseEnter={(event) => handleEnter(groupIndex, event, label)}
                />
              );
            });
          })}
        </g>
      </svg>

      {tooltip ? (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -110%)',
            background: 'var(--surface)',
            color: 'var(--foreground)',
            border: '1px solid var(--surface-hover)',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
            minWidth: '8rem',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{tooltip.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {tooltip.values.map((item) => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span>{item.name}</span>
                <span style={{ color: item.fill }}>{item.formatted}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {legend ? legend() : null}
    </div>
  );
}

import * as React from "react"
import * as RechartsPrimitive from "recharts"

interface ChartProps extends React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer> {
  children: React.ReactNode;
}

interface ChartTooltipProps extends React.ComponentProps<typeof RechartsPrimitive.Tooltip> {
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
  active?: boolean;
}

interface ChartPayloadItem {
  value: number;
  name: string;
  color: string;
}

export function Chart({ children, ...props }: ChartProps) {
  return (
    <RechartsPrimitive.ResponsiveContainer {...props}>
      {children}
    </RechartsPrimitive.ResponsiveContainer>
  );
}

export function ChartTooltip({ active, payload, label, ...props }: ChartTooltipProps) {
  if (!active || !payload) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {label}
          </span>
          <span className="font-bold text-muted-foreground">
            {payload[0]?.value}
          </span>
        </div>
        {payload.map((item: ChartPayloadItem, index: number) => (
          <div key={index} className="flex flex-col">
            <span
              className="text-[0.70rem] uppercase text-muted-foreground"
              style={{ color: item.color }}
            >
              {item.name}
            </span>
            <span className="font-bold" style={{ color: item.color }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

Chart.Line = RechartsPrimitive.Line;
Chart.Bar = RechartsPrimitive.Bar;
Chart.XAxis = RechartsPrimitive.XAxis;
Chart.YAxis = RechartsPrimitive.YAxis;
Chart.CartesianGrid = RechartsPrimitive.CartesianGrid;
Chart.Tooltip = ChartTooltip;

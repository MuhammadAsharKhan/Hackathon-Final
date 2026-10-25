import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "@/components/data/ChartCard";

// Every chart carries a text summary for screen readers, because the drawing
// itself is not readable.
function ScreenReaderSummary({ label }) {
  return <p className="sr-only">{label}</p>;
}

const SERIES = ["#1C74EF", "#88C443", "#4B94FF", "#4F8A1D", "#162842", "#B45309"];

const axis = {
  tick: { fill: "#66768D", fontSize: 12.5 },
  tickLine: false,
  axisLine: false,
};

const grid = (
  <CartesianGrid stroke="#EEF2F8" strokeDasharray="3 4" vertical={false} />
);

const tooltipStyle = {
  contentStyle: {
    background: "#07111F",
    border: "none",
    borderRadius: 12,
    boxShadow:
      "0 14px 34px -8px rgba(12,38,92,0.16), 0 3px 8px rgba(12,38,92,0.06)",
    color: "#FFFFFF",
    fontSize: 12.5,
    padding: "8px 12px",
  },
  labelStyle: { color: "#FFFFFF", fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: "#FFFFFF" },
  cursor: { fill: "rgba(28,116,239,0.06)" },
};

const legendProps = {
  iconType: "circle",
  iconSize: 8,
  wrapperStyle: { fontSize: 12.5, paddingTop: 8 },
};

export function BarChartBox({
  title,
  description,
  actions,
  data = [],
  xKey,
  series = [],
  emptyMessage,
  valueFormatter = (value) => value,
  labelFormatter,
  summary,
  height,
}) {
  const readable = summary ?? `${title}.`;
  const values = data.map((row) => Number(row[series[0]?.key]) || 0);
  const highest = values.length ? Math.max(...values) : -1;

  return (
    <ChartCard
      title={title}
      description={description}
      actions={actions}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
      height={height}
    >
      <figure className="h-full w-full">
        <ScreenReaderSummary label={readable} />
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((item, index) => (
                <linearGradient
                  key={item.key}
                  id={`bar-${title.replace(/\W/g, "")}-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={item.color ?? SERIES[index % SERIES.length]}
                    stopOpacity={1}
                  />
                  <stop
                    offset="100%"
                    stopColor={item.color ?? SERIES[index % SERIES.length]}
                    stopOpacity={0.55}
                  />
                </linearGradient>
              ))}
            </defs>

            {grid}
            <XAxis
              dataKey={xKey}
              {...axis}
              interval={0}
              angle={data.length > 6 ? -20 : 0}
              textAnchor={data.length > 6 ? "end" : "middle"}
              height={data.length > 6 ? 56 : 30}
            />
            <YAxis {...axis} width={56} tickFormatter={valueFormatter} />
            <Tooltip
              {...tooltipStyle}
              formatter={valueFormatter}
              labelFormatter={labelFormatter}
            />

            {series.length > 1 ? <Legend {...legendProps} /> : null}

            {series.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label ?? item.key}
                fill={`url(#bar-${title.replace(/\W/g, "")}-${index})`}
                radius={[10, 10, 0, 0]}
                maxBarSize={44}
                animationDuration={600}
              >
                {/* the tallest bar carries the accent */}
                {data.map((row, rowIndex) =>
                  series.length === 1 && Number(row[item.key]) === highest ? (
                    <Cell key={rowIndex} fill="#88C443" />
                  ) : null
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </figure>
    </ChartCard>
  );
}

export function LineChartBox({
  title,
  description,
  actions,
  data = [],
  xKey,
  series = [],
  emptyMessage,
  valueFormatter = (value) => value,
  labelFormatter,
  summary,
  height,
}) {
  const readable = summary ?? `${title}.`;
  const gradientId = `area-${title.replace(/\W/g, "")}`;

  return (
    <ChartCard
      title={title}
      description={description}
      actions={actions}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
      height={height}
    >
      <figure className="h-full w-full">
        <ScreenReaderSummary label={readable} />
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              {series.map((item, index) => (
                <linearGradient
                  key={item.key}
                  id={`${gradientId}-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#1C74EF" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#1C74EF" stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            {grid}
            <XAxis dataKey={xKey} {...axis} minTickGap={16} />
            <YAxis {...axis} width={56} tickFormatter={valueFormatter} />
            <Tooltip
              {...tooltipStyle}
              formatter={valueFormatter}
              labelFormatter={labelFormatter}
            />

            {series.length > 1 ? <Legend {...legendProps} /> : null}

            {series.map((item, index) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label ?? item.key}
                stroke={item.color ?? "#1C74EF"}
                strokeWidth={2.5}
                fill={`url(#${gradientId}-${index})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#FFFFFF" }}
                animationDuration={600}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </figure>
    </ChartCard>
  );
}

export function PieChartBox({
  title,
  description,
  actions,
  data = [],
  nameKey = "name",
  valueKey = "value",
  emptyMessage,
  valueFormatter = (value) => value,
  summary,
  height,
}) {
  const readable =
    summary ??
    `${title}. ${data.map((row) => `${row[nameKey]} ${row[valueKey]}`).join(", ")}.`;
  const total = data.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0);

  return (
    <ChartCard
      title={title}
      description={description}
      actions={actions}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
      height={height}
    >
      <figure className="h-full w-full">
        <ScreenReaderSummary label={readable} />
        <div className="relative h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip {...tooltipStyle} formatter={valueFormatter} />
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                innerRadius="72%"
                outerRadius="92%"
                paddingAngle={2}
                cornerRadius={6}
                animationDuration={600}
              >
                {data.map((row, index) => (
                  <Cell
                    key={row[nameKey]}
                    fill={SERIES[index % SERIES.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Legend {...legendProps} />
            </PieChart>
          </ResponsiveContainer>

          {/* the total sits in the middle of the donut */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6"
          >
            <span className="font-display text-[26px] font-extrabold tabular-nums text-text">
              {total}
            </span>
          </div>
        </div>
      </figure>
    </ChartCard>
  );
}

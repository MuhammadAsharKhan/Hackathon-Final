import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "@/components/data/ChartCard";
import { chartTheme, tooltipStyles } from "@/lib/chart";

// Every chart carries a text summary for screen readers, because the drawing
// itself is not readable.
function ScreenReaderSummary({ label }) {
  return <p className="sr-only">{label}</p>;
}

const axisProps = (theme) => ({
  stroke: theme.grid,
  tick: { fill: theme.axis, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: theme.grid },
});

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
  const theme = chartTheme();
  const tooltip = tooltipStyles();
  const readable = summary ?? `${title}.`;

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
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey={xKey} {...axisProps(theme)} interval={0} angle={data.length > 6 ? -20 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 56 : 30} />
            <YAxis {...axisProps(theme)} width={56} tickFormatter={valueFormatter} />
            <Tooltip
              {...tooltip}
              formatter={valueFormatter}
              labelFormatter={labelFormatter}
              cursor={{ fill: "var(--muted)" }}
            />
            {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
            {series.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label ?? item.key}
                fill={item.color ?? theme.series[index % theme.series.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
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
  const theme = chartTheme();
  const tooltip = tooltipStyles();
  const readable = summary ?? `${title}.`;

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
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey={xKey} {...axisProps(theme)} minTickGap={16} />
            <YAxis {...axisProps(theme)} width={56} tickFormatter={valueFormatter} />
            <Tooltip {...tooltip} formatter={valueFormatter} labelFormatter={labelFormatter} />
            {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
            {series.map((item, index) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label ?? item.key}
                stroke={item.color ?? theme.series[index % theme.series.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
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
  const theme = chartTheme();
  const tooltip = tooltipStyles();
  const readable =
    summary ??
    `${title}. ${data.map((row) => `${row[nameKey]} ${row[valueKey]}`).join(", ")}.`;

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
          <PieChart>
            <Tooltip {...tooltip} formatter={valueFormatter} />
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={nameKey}
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={2}
            >
              {data.map((row, index) => (
                <Cell
                  key={row[nameKey]}
                  fill={theme.series[index % theme.series.length]}
                />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </figure>
    </ChartCard>
  );
}

import type { Chart, Planet } from "@/types/chart";
import {
  CENTER,
  INNER_RADIUS,
  OUTER_RADIUS,
  WHEEL_SIZE,
  axis,
  placePlanets,
  signDividers,
  type Segment,
} from "./wheel-geometry";

const LIGHTS: readonly Planet[] = ["sun", "moon"];

/** Dots only, no symbols or labels: the drawing is a shape to recognise, not a chart to decode. */
export function ChartWheel({ chart }: { chart: Chart }) {
  const rising = chart.ascendant.longitude;
  const axes = chart.birthTimeKnown
    ? [axis(rising, rising), axis(chart.midheaven.longitude, rising)]
    : [];

  return (
    <svg
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
      role="img"
      aria-label="A wheel showing where the sun, the moon and the planets stood when you were born."
      className="mx-auto block w-full max-w-sm"
    >
      <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS} strokeWidth={1} className="fill-none stroke-muted" />
      <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} strokeWidth={0.75} className="fill-none stroke-muted" />

      {signDividers(rising).map((segment, i) => (
        <Line key={i} segment={segment} strokeWidth={0.75} className="stroke-hairline" />
      ))}
      {axes.map((segment, i) => (
        <Line key={i} segment={segment} strokeWidth={0.75} className="stroke-ink" />
      ))}

      {placePlanets(chart).map(({ planet, point }) => (
        <circle
          key={planet}
          cx={point.x}
          cy={point.y}
          r={LIGHTS.includes(planet) ? 5 : 3.5}
          strokeWidth={1.25}
          className={planet === "moon" ? "fill-paper stroke-ink" : "fill-ink stroke-ink"}
        />
      ))}
    </svg>
  );
}

function Line({
  segment,
  strokeWidth,
  className,
}: {
  segment: Segment;
  strokeWidth: number;
  className: string;
}) {
  return (
    <line
      x1={segment.from.x}
      y1={segment.from.y}
      x2={segment.to.x}
      y2={segment.to.y}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}

import type { Chart, PointId } from "@/types/chart";
import { PlanetMark } from "./PlanetMark";
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

/**
 * Dots only, no symbols or labels: the drawing is a shape to recognise, not a chart to decode.
 * With `emphasis`, those points stay in ink and everything else goes quiet.
 * Without a birth time there are no houses to divide, so the planets sit on a plain ring.
 */
export function ChartWheel({ chart, emphasis = [] }: { chart: Chart; emphasis?: readonly PointId[] }) {
  const rising = chart.ascendant.longitude;
  const quiet = (point: PointId) => emphasis.length > 0 && !emphasis.includes(point);
  const axes: { point: PointId; segment: Segment }[] = chart.birthTimeKnown
    ? [
        { point: "asc", segment: axis(rising, rising) },
        { point: "mc", segment: axis(chart.midheaven.longitude, rising) },
      ]
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

      {chart.birthTimeKnown
        ? signDividers(rising).map((segment, i) => (
            <Line key={i} segment={segment} strokeWidth={0.75} className="stroke-hairline" />
          ))
        : null}
      {axes.map(({ point, segment }) => (
        <Line
          key={point}
          segment={segment}
          strokeWidth={0.75}
          className={`${quiet(point) ? "stroke-muted" : "stroke-ink"} transition-colors duration-700`}
        />
      ))}

      {placePlanets(chart).map(({ planet, point }) => (
        <PlanetMark key={planet} planet={planet} at={point} quiet={quiet(planet)} />
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

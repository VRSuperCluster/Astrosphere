import type { Chart, PointId } from "@/types/chart";
import { PlanetMark } from "./PlanetMark";
import {
  CENTER,
  INNER_RADIUS,
  OUTER_RADIUS,
  WHEEL_SIZE,
  axis,
  layoutMarkers,
  placePlanets,
  signDividers,
  type Segment,
} from "./wheel-geometry";

/** Card numbers (1–3) for each point the summary mentioned. One point can carry several. */
export function markersFor(
  patterns: readonly { pointIds: readonly PointId[] }[],
): Partial<Record<PointId, number[]>> {
  const markers: Partial<Record<PointId, number[]>> = {};
  patterns.forEach((card, index) => {
    for (const id of card.pointIds) {
      const numbers = markers[id] ?? [];
      numbers.push(index + 1);
      markers[id] = numbers;
    }
  });
  return markers;
}

/**
 * Dots only, no symbols or labels: the drawing is a shape to recognise, not a chart to decode.
 * With `emphasis`, those points stay in ink and everything else goes quiet.
 * Without a birth time there are no houses to divide, so the planets sit on a plain ring.
 */
export function ChartWheel({
  chart,
  emphasis = [],
  markers = {},
}: {
  chart: Chart;
  emphasis?: readonly PointId[];
  markers?: Partial<Record<PointId, readonly number[]>>;
}) {
  const rising = chart.ascendant.longitude;
  const quiet = (point: PointId) => emphasis.length > 0 && !emphasis.includes(point);
  const planets = placePlanets(chart);
  const axes: { point: PointId; segment: Segment }[] = chart.birthTimeKnown
    ? [
        { point: "asc", segment: axis(rising, rising) },
        { point: "mc", segment: axis(chart.midheaven.longitude, rising) },
      ]
    : [];
  const placed = layoutMarkers([
    ...axes.map(({ point, segment }) => ({ point, at: segment.from, numbers: markers[point] ?? [] })),
    ...planets.map(({ planet, point }) => ({ point: planet, at: point, numbers: markers[planet] ?? [] })),
  ]);

  return (
    <svg
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
      role="img"
      aria-label="A wheel showing where the sun, the moon and the planets stood when you were born."
      className="mx-auto block w-full max-w-sm"
    >
      <g id="wheel-rings">
        <circle
          id="wheel-ring"
          cx={CENTER}
          cy={CENTER}
          r={OUTER_RADIUS}
          strokeWidth={1}
          className="fill-none stroke-muted"
        />
        <circle
          id="wheel-ring-inner"
          cx={CENTER}
          cy={CENTER}
          r={INNER_RADIUS}
          strokeWidth={0.75}
          className="fill-none stroke-muted"
        />
      </g>

      {chart.birthTimeKnown ? (
        <g id="wheel-dividers">
          {/* 1 is 0° Aries, then every 30°, so the ids stay put when the rising degree changes. */}
          {signDividers(rising).map((segment, i) => (
            <Line
              key={i}
              id={`wheel-divider-${i + 1}`}
              segment={segment}
              strokeWidth={0.75}
              className="stroke-hairline"
            />
          ))}
        </g>
      ) : null}

      {axes.length > 0 ? (
        <g id="wheel-axes">
          {axes.map(({ point, segment }) => (
            <g key={point} id={`wheel-axis-${point}`}>
              <Line
                segment={segment}
                strokeWidth={0.75}
                className={`${quiet(point) ? "stroke-muted" : "stroke-ink"} transition-colors duration-700`}
              />
              <MarkerLabels markers={placed.filter((marker) => marker.point === point)} />
            </g>
          ))}
        </g>
      ) : null}

      <g id="wheel-points">
        {planets.map(({ planet, point }) => (
          <g key={planet} id={`wheel-point-${planet}`}>
            <PlanetMark planet={planet} at={point} quiet={quiet(planet)} />
            <MarkerLabels markers={placed.filter((marker) => marker.point === planet)} />
          </g>
        ))}
      </g>
    </svg>
  );
}

function Line({
  id,
  segment,
  strokeWidth,
  className,
}: {
  id?: string;
  segment: Segment;
  strokeWidth: number;
  className: string;
}) {
  return (
    <line
      id={id}
      x1={segment.from.x}
      y1={segment.from.y}
      x2={segment.to.x}
      y2={segment.to.y}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}

/** The number on a card, repeated beside the point that card comes from. */
function MarkerLabels({ markers }: { markers: readonly { point: PointId; number: number; x: number; y: number }[] }) {
  return markers.map((marker) => (
    <text
      key={marker.number}
      id={`wheel-marker-${marker.point}-${marker.number}`}
      x={marker.x}
      y={marker.y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-ink font-body"
      fontSize={11}
    >
      {marker.number}
    </text>
  ));
}

import type { PlanetId } from "@/types/chart";
import type { Point } from "./wheel-geometry";

const LIGHTS: readonly PlanetId[] = ["sun", "moon"];

/**
 * How one planet looks. The wheel decides where it goes, so a new look
 * (colour, illustration, artwork) only replaces this component.
 */
export function PlanetMark({ planet, at, quiet }: { planet: PlanetId; at: Point; quiet: boolean }) {
  const tone = quiet ? "stroke-muted" : "stroke-ink";
  const fill = planet === "moon" ? "fill-paper" : quiet ? "fill-muted" : "fill-ink";
  return (
    <circle
      cx={at.x}
      cy={at.y}
      r={LIGHTS.includes(planet) ? 5 : 3.5}
      strokeWidth={1.25}
      className={`${fill} ${tone} transition-colors duration-700`}
    />
  );
}

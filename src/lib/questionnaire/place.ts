import type { Place } from "@/types/places";

/** The geocoder returns nothing for one-character queries. */
export const MIN_PLACE_QUERY_LENGTH = 2;
export const MAX_PLACE_QUERY_LENGTH = 100;

/** "Lisbon, Lisbon District, Portugal". Repeated or missing parts are dropped. */
export function describePlace(place: Place): string {
  return [place.name, place.region, place.country]
    .filter((part, i, parts): part is string => Boolean(part) && parts.indexOf(part) === i)
    .join(", ");
}

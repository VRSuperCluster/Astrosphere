/** A geocoded place of birth. The zone converts local birth time to UTC. */
export interface Place {
  id: number;
  name: string;
  /** First-level region (state, province). Missing for some places. */
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  /** IANA zone, e.g. "Europe/Lisbon". */
  timezone: string;
}

export interface PlacesResponse {
  places: Place[];
}

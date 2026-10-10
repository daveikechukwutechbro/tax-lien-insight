export const JURISDICTION_TYPES = [
  "state",
  "county",
  "parish",
  "borough",
  "independent_city",
  "municipality",
  "county_equivalent",
  "other",
] as const;
export type JurisdictionType = (typeof JURISDICTION_TYPES)[number];

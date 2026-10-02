/**
 * Demo catalog generator.
 *
 * Tops each auction on the calendar up to TARGET_PER_AUCTION properties/lots with
 * varied conditions (statuses, rates, taxes, redemption terms, property types).
 *
 * SAFETY: this writes directly to whatever DATABASE_URL points at. It is gated so
 * it NEVER runs silently against production:
 *   - `ENVIRONMENT=development` may run freely.
 *   - Otherwise it requires RUN_DEMO_CATALOG=1 explicitly.
 * Re-runs are idempotent: it only adds lots up to the per-auction target, so it
 * will never duplicate an existing catalog.
 */
import { getPool } from "./pool.js";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";

const TARGET_PER_AUCTION = 10;

type CountyProfile = {
  city: string;
  state: string;
  streets: string[];
  zips: string[];
  taxesMinUsd: number;
  taxesMaxUsd: number;
};

const PROFILES: Record<string, CountyProfile> = {
  "Essex County": {
    city: "Newark",
    state: "NJ",
    streets: ["Martin Luther King Blvd", "Broad St", "Joralemon St", "Maple Ave", "Ferry St", "Summer Ave", "Bergen St", "Central Ave", "Clinton Ave", "Mount Prospect Ave"],
    zips: ["07102", "07103", "07104", "07105", "07112"],
    taxesMinUsd: 6000,
    taxesMaxUsd: 250000,
  },
  "Cook County": {
    city: "Chicago",
    state: "IL",
    streets: ["W Fullerton Ave", "N Kedzie Ave", "S Western Ave", "W Division St", "N Pulaski Rd", "S Kedvale Ave", "W Belmont Ave", "N Central Park Ave", "S Archer Ave", "W 63rd St"],
    zips: ["60614", "60625", "60618", "60623", "60609"],
    taxesMinUsd: 8000,
    taxesMaxUsd: 400000,
  },
  "Wayne County": {
    city: "Detroit",
    state: "MI",
    streets: ["W Grand Blvd", "Michigan Ave", "E Jefferson Ave", "Woodward Ave", "Cass Ave", "W Warren Ave", "Grand River Ave", "E Grand Blvd", "Livernois Ave", "Van Dyke Ave"],
    zips: ["48201", "48202", "48216", "48224", "48226"],
    taxesMinUsd: 2500,
    taxesMaxUsd: 120000,
  },
  "Harris County": {
    city: "Houston",
    state: "TX",
    streets: ["Main St", "Washington Ave", "Bissonnet St", "Houston Ave", "Montrose Blvd", "Richmond Ave", "Southmore Blvd", "Gessner Rd", "Crosby St", "Emancipation Ave"],
    zips: ["77002", "77003", "77004", "77008", "77019"],
    taxesMinUsd: 5000,
    taxesMaxUsd: 300000,
  },
  "Miami-Dade County": {
    city: "Miami",
    state: "FL",
    streets: ["SW 8th St", "NE 2nd Ave", "Biscayne Blvd", "NW 36th St", "SW 27th Ave", "NW 7th Ave", "NE 79th St", "SW 40th St", "NW 54th St", "E Flagler St"],
    zips: ["33125", "33126", "33127", "33130", "33165"],
    taxesMinUsd: 4000,
    taxesMaxUsd: 220000,
  },
};

// Lot statuses per auction-wide condition. These deliberately reflect different
// phases of a sale while remaining visible on the calendar (the discovery feed
// hides only cancelled/withdrawn/archived).
const STATUSES: Record<string, string[]> = {
  live: ["live", "live", "live", "closing", "live", "paused", "live", "closing", "live", "live"],
  registration_open: ["open", "scheduled", "open", "open", "open", "scheduled", "open", "open", "open", "open"],
  registration_closed: ["scheduled", "scheduled", "open", "scheduled", "scheduled", "scheduled", "scheduled", "open", "scheduled", "scheduled"],
  scheduled: ["scheduled", "scheduled", "scheduled", "scheduled", "scheduled", "scheduled", "scheduled", "scheduled", "scheduled", "scheduled"],
  results_finalized: ["closed", "awarded", "closed", "settled", "awarded", "closed", "unawarded", "settled", "closed", "awarded"],
};
const DEFAULT_STATUSES = STATUSES.scheduled;

const PROPERTY_TYPES = ["residential", "residential", "residential", "residential", "residential", "commercial", "commercial", "land", "land", "industrial"];

// Deterministic PRNG so repeated runs produce stable data.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function pickCents(rnd: () => number, minUsd: number, maxUsd: number): number {
  return (minUsd + Math.floor(rnd() * (maxUsd - minUsd + 1))) * 100;
}

export async function generateDemoCatalog(): Promise<void> {
  if (!config.isDevelopment && process.env.RUN_DEMO_CATALOG !== "1") {
    logger.error(
      `Refusing to run demo catalog: ENVIRONMENT=${config.environment} and RUN_DEMO_CATALOG is not set to 1. Set RUN_DEMO_CATALOG=1 to confirm you want to write demo data to this database.`,
    );
    process.exit(2);
  }
  const confirm = config.isDevelopment
    ? "development"
    : `production (RUN_DEMO_CATALOG explicitly set)`;
  logger.warn(`Demo catalog generation running against database (${confirm}).`, {
    host: new URL(config.databaseUrl).host,
    database: new URL(config.databaseUrl).pathname.replace(/^\//, ""),
  });

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.status, a.jurisdiction_id,
            j.name AS county, s.code AS state
     FROM auctions a
     LEFT JOIN jurisdictions j ON j.id = a.jurisdiction_id
     LEFT JOIN states s ON s.id = j.state_id
     WHERE a.status <> 'archived' AND a.status <> 'cancelled'
     ORDER BY a.starts_at NULLS LAST`,
  );

  let generated = 0;
  let run = 0;
  for (const auction of rows) {
    const county = (auction.county as string) ?? "";
    const profile = PROFILES[county] ?? {
      city: (auction.county as string) ?? "Downtown",
      state: (auction.state as string) ?? "US",
      streets: ["Main St", "Oak St", "Washington Ave", "Broadway", "Pine Ave", "Center St", "Riverside Dr", "Park Ave", "South St", "Hill St"],
      zips: ["00000"],
      taxesMinUsd: 3000,
      taxesMaxUsd: 200000,
    };
    const statusPool = STATUSES[auction.status as string] ?? DEFAULT_STATUSES;
    const rng = makeRng(1000 + run * 7919);

    const { rows: [{ count }] } = await pool.query(
      `SELECT count(*)::int AS count FROM auction_lots WHERE auction_id = $1`,
      [auction.id],
    );
    const need = TARGET_PER_AUCTION - Number(count);
    if (need <= 0) {
      logger.info("Auction already at target, skipping", { title: auction.title, lots: count });
      run += 1;
      continue;
    }

    let added = 0;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < need; i += 1) {
        run += 1;
        const local = run * 37 + i;
        const street = profile.streets[(run + i) % profile.streets.length];
        const number = 100 + ((run * 83 + i * 17) % 8800);
        const address = `${number} ${street}`;
        const zip = pick(rng, profile.zips);
        const taxes = pickCents(rng, profile.taxesMinUsd, profile.taxesMaxUsd);
        const assessed = pickCents(rng, profile.taxesMinUsd, profile.taxesMaxUsd) * (5 + Math.floor(rng() * 10));
        const propertyType = pick(rng, PROPERTY_TYPES);
        const parcel = `${String(10 + (run % 89)).padStart(2, "0")}-${String(1 + (local % 31)).padStart(2, "0")}-${String(100 + (local % 899)).padStart(3, "0")}-${String(1 + (local % 9)).padStart(3, "0")}`;
        const zoning = propertyType === "residential" ? "R-2" : propertyType === "commercial" ? "C-1" : propertyType === "industrial" ? "M-1" : "AG";

        const { rows: [p] } = await client.query(
          `INSERT INTO properties
             (jurisdiction_id, parcel_id, address, city, state, postal_code, property_type,
              assessed_value, legal_description, zoning, status, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active','{}'::jsonb)
           RETURNING id`,
          [
            auction.jurisdiction_id,
            parcel,
            address,
            profile.city,
            profile.state,
            zip,
            propertyType,
            assessed,
            `Tax sale parcel ${parcel}`,
            zoning,
          ],
        );

        const startingRate = Number((2 + rng() * 15).toFixed(2));
        const isHot = auction.status === "live" || auction.status === "closing";
        const currentRate = isHot
          ? Number((startingRate + (0.5 + rng() * 4)).toFixed(2))
          : startingRate;
        const status = statusPool[i];
        const taxYear = 2023 + Math.floor(rng() * 3);
        const redemption = pick(rng, [6, 12, 12, 12, 18]);

        await client.query(
          `INSERT INTO auction_lots
             (auction_id, property_id, parcel_id, status, starting_rate, current_rate,
              minimum_rate, rate_increment, rate_precision, taxes_owed, tax_year, redemption_period_months)
           VALUES ($1,$2,$3,$4,$5,$6,0,0.25,2,$7,$8,$9)`,
          [
            auction.id,
            p.id,
            parcel,
            status,
            startingRate,
            currentRate,
            taxes,
            taxYear,
            redemption,
          ],
        );
        added += 1;
        generated += 1;
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    logger.info("Topped up auction", {
      title: auction.title,
      added,
      status: auction.status,
      totalLots: Number(count) + added,
    });
  }
  logger.info("Demo catalog complete", { generated });
}

if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url.includes(process.argv[1].replaceAll("\\", "/"))
) {
  generateDemoCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
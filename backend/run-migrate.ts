import "dotenv/config";
import { runMigrations } from "./src/db/migrate.js";

runMigrations().then(
  () => { console.log("Done"); process.exit(0); },
  (err) => { console.error(err); process.exit(1); }
);

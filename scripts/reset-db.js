// Drops one database, and only the one named on the command line. A typo in
// MONGODB_URI or a missing argument stops before anything is deleted.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const requireFromServer = createRequire(
  path.join(import.meta.dirname, "..", "server", "package.json")
);
const mongoose = requireFromServer("mongoose");

const readMongoUri = () => {
  const envPath = path.join(import.meta.dirname, "..", "server", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("server/.env is missing, so there is no database to reset.");
    process.exit(1);
  }

  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith("MONGODB_URI="));

  if (!line) {
    console.error("MONGODB_URI is not set in server/.env.");
    process.exit(1);
  }

  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
};

const databaseNameOf = (uri) => {
  const withoutQuery = uri.split("?")[0];
  const name = withoutQuery.slice(withoutQuery.lastIndexOf("/") + 1);
  return name || "";
};

const main = async () => {
  const requested = process.argv[2];
  const uri = readMongoUri();
  const name = databaseNameOf(uri);

  if (!requested) {
    console.error("Usage: node scripts/reset-db.js <database-name>");
    console.error(`MONGODB_URI currently points at: ${name}`);
    process.exit(1);
  }

  if (requested !== name) {
    console.error(
      `Refusing to drop "${requested}": MONGODB_URI points at "${name}". Nothing was deleted.`
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  console.log(`Dropped database "${name}".`);
};

main().catch((error) => {
  console.error("The reset failed:", error.message);
  process.exit(1);
});

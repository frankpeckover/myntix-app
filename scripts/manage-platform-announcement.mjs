import pg from "pg";
import { loadEnvironment } from "./env-file-loader.mjs";

const { Pool } = pg;
const environment = loadEnvironment();
const [command, ...rawArgs] = process.argv.slice(2);
const args = parseArgs(rawArgs);
const pool = new Pool({
  database: requireEnvironment("PLATFORM_POSTGRES_DATABASE"),
  host: requireEnvironment("PLATFORM_POSTGRES_HOST"),
  password: requireEnvironment("PLATFORM_POSTGRES_PASSWORD"),
  port: Number(environment.PLATFORM_POSTGRES_PORT || 5432),
  user: requireEnvironment("PLATFORM_POSTGRES_USER"),
});

try {
  if (command === "set") {
    await setAnnouncement();
  } else if (command === "clear") {
    await clearAnnouncement();
  } else if (command === "status") {
    await showStatus();
  } else {
    printUsage();
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}

async function setAnnouncement() {
  const message = String(args.message ?? "").trim();
  const severity = String(args.severity ?? "warning").trim().toLowerCase();
  const startsAt = parseDate(args["starts-at"], "starts-at") ?? new Date();
  const endsAt = parseDate(args["ends-at"], "ends-at");

  if (!message || message.length > 1000) {
    throw new Error("--message must contain between 1 and 1000 characters.");
  }

  if (!["info", "warning", "critical"].includes(severity)) {
    throw new Error("--severity must be info, warning, or critical.");
  }

  if (endsAt && endsAt <= startsAt) {
    throw new Error("--ends-at must be later than --starts-at.");
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      "update platform_announcements set is_active = false, updated_at = now() where is_active = true",
    );
    const result = await client.query(
      `
        insert into platform_announcements (
          message, severity, starts_at, ends_at
        )
        values ($1, $2, $3, $4)
        returning id, message, severity, starts_at, ends_at
      `,
      [message, severity, startsAt, endsAt],
    );
    await client.query("commit");
    printAnnouncement("Maintenance announcement saved", result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function clearAnnouncement() {
  const result = await pool.query(
    "update platform_announcements set is_active = false, updated_at = now() where is_active = true",
  );
  console.log(`Cleared ${result.rowCount ?? 0} active maintenance announcement(s).`);
}

async function showStatus() {
  const result = await pool.query(
    `
      select id, message, severity, starts_at, ends_at
      from platform_announcements
      where is_active = true
      order by starts_at desc, created_at desc
      limit 1
    `,
  );

  if (!result.rows[0]) {
    console.log("No active maintenance announcement.");
    return;
  }

  printAnnouncement("Current maintenance announcement", result.rows[0]);
}

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!value.startsWith("--")) {
      throw new Error(`Unexpected argument: ${value}`);
    }

    const name = value.slice(2);
    const nextValue = values[index + 1];

    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Missing value for --${name}.`);
    }

    parsed[name] = nextValue;
    index += 1;
  }

  return parsed;
}

function parseDate(value, name) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`--${name} must be a valid ISO date and time.`);
  }

  return parsed;
}

function requireEnvironment(name) {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function printAnnouncement(title, announcement) {
  console.log(title);
  console.log(`  ID: ${announcement.id}`);
  console.log(`  Severity: ${announcement.severity}`);
  console.log(`  Starts: ${new Date(announcement.starts_at).toISOString()}`);
  console.log(
    `  Ends: ${announcement.ends_at ? new Date(announcement.ends_at).toISOString() : "No automatic expiry"}`,
  );
  console.log(`  Message: ${announcement.message}`);
}

function printUsage() {
  console.log(`Usage:
  npm run maintenance -- set --message "Scheduled maintenance..." [--starts-at ISO_DATE] [--ends-at ISO_DATE] [--severity warning]
  npm run maintenance -- status
  npm run maintenance -- clear`);
}

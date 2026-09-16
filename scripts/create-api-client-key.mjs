import { createHmac, randomBytes } from "node:crypto";

const allowedScopes = new Set([
  "accounts:read",
  "ledger:read",
  "ledger:credit",
  "ledger:debit",
  "holds:read",
  "holds:write",
  "rewards:read",
  "purchases:read",
  "purchases:write",
]);
const apiKeyPrefixLength = 20;
const apiKey = `myntix_live_${randomBytes(32).toString("base64url")}`;
const apiKeyHashSecret = process.env.API_KEY_HASH_SECRET?.trim();
const parsedArgs = parseArgs(process.argv.slice(2));

if (!apiKeyHashSecret) {
  console.error("Missing required environment variable: API_KEY_HASH_SECRET");
  process.exit(1);
}

if (!parsedArgs.name || parsedArgs.scopes.length === 0) {
  printUsageAndExit();
}

const invalidScopes = parsedArgs.scopes.filter(
  (scope) => !allowedScopes.has(scope),
);

if (invalidScopes.length > 0) {
  console.error(`Invalid scope(s): ${invalidScopes.join(", ")}`);
  printUsageAndExit();
}

const keyHash = createHmac("sha256", apiKeyHashSecret)
  .update(apiKey)
  .digest("hex");
const keyPrefix = apiKey.slice(0, apiKeyPrefixLength);

console.log("API key. Store this in the external app now; it is not stored again.");
console.log(apiKey);
console.log("");
console.log("Run this SQL against the school database:");
console.log("");
console.log(buildInsertSql(parsedArgs.name, keyPrefix, keyHash, parsedArgs.scopes));

function parseArgs(args) {
  const parsed = {
    name: "",
    scopes: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--name") {
      parsed.name = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--scopes") {
      parsed.scopes = (args[index + 1] ?? "")
        .split(",")
        .map((scope) => scope.trim())
        .filter(Boolean);
      index += 1;
    }
  }

  return parsed;
}

function buildInsertSql(name, keyPrefix, keyHash, scopes) {
  const scopeValues = scopes
    .map((scope) => `  (${quoteSql(scope)})`)
    .join(",\n");

  return `begin;

with client as (
  insert into api_clients (name, key_prefix, key_hash)
  values (${quoteSql(name)}, ${quoteSql(keyPrefix)}, ${quoteSql(keyHash)})
  returning id
)
insert into api_client_scopes (client_id, scope)
select client.id, scopes.scope
from client
cross join (
  values
${scopeValues}
) as scopes(scope);

commit;`;
}

function quoteSql(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function printUsageAndExit() {
  console.error(
    [
      "Usage:",
      "  npm run create-api-client -- --name \"Rewards app\" --scopes accounts:read,holds:read,holds:write,rewards:read,purchases:read,purchases:write",
      "",
      "Allowed scopes:",
      `  ${Array.from(allowedScopes).join(", ")}`,
    ].join("\n"),
  );
  process.exit(1);
}

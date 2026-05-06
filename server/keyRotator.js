/**
 * OmniAgent Key Rotator
 * Fetches fresh free-llm-api-keys from GitHub every 2 hours.
 * Source: https://github.com/alistaitsacle/free-llm-api-keys
 */

const GITHUB_README_URL =
  "https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md";
const ROTATE_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours

let lastRotation = null;
let lastRotationStatus = "never";
let rotationLog = [];

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  rotationLog = [...rotationLog.slice(-49), entry];
  console.log(`🔑 KeyRotator: ${msg}`);
}

/** Extract all `sk-xxx` keys from a markdown string */
function extractKeys(text) {
  const pattern = /`(sk-[A-Za-z0-9]{20,})`/g;
  const keys = [];
  let m;
  while ((m = pattern.exec(text)) !== null) keys.push(m[1]);
  return keys;
}

/**
 * Parse the README markdown and return a map of { ENV_VAR: freshKey }.
 * Only picks rows marked 🆕 New so we get the freshest keys.
 */
function parseReadme(markdown) {
  const result = {};

  // Split on ### section headings
  const sections = markdown.split(/^###\s+/m);

  for (const section of sections) {
    const heading = section.split("\n")[0].toLowerCase();

    // Determine target env var from section heading
    let envVar = null;
    if (heading.includes("multi-model") || heading.includes("smart-chat")) {
      envVar = "PEKPIK_API_KEY";
    } else if (heading.includes("kimi")) {
      envVar = "KIMI_API_KEY";
    } else if (heading.includes("deepseek")) {
      envVar = "DEEPSEEK_API_KEY";
    } else if (heading.includes("xai") || heading.includes("grok")) {
      envVar = "XAI_API_KEY";
    } else if (heading.includes("openai") || heading.includes("gpt")) {
      // GPT-class keys via pekpik are usable as PEKPIK_API_KEY
      if (!result["PEKPIK_API_KEY"]) envVar = "PEKPIK_API_KEY";
    } else if (heading.includes("gemini") || heading.includes("google")) {
      // Gemini keys via pekpik are usable as XAI_API_KEY (both route via pekpik base)
      if (!result["XAI_API_KEY"]) envVar = "XAI_API_KEY";
    }

    if (!envVar || result[envVar]) continue; // Already have a key for this provider

    // Only consider rows containing 🆕 (freshest keys)
    const freshLines = section
      .split("\n")
      .filter((l) => l.includes("🆕") || l.includes("New"))
      .join("\n");

    const keys = extractKeys(freshLines);
    if (keys.length > 0) {
      result[envVar] = keys[0];
    }
  }

  return result;
}

/** Fetch GitHub README and rotate any changed keys into process.env */
export async function rotateKeys() {
  try {
    log("Fetching fresh keys from GitHub...");
    const res = await fetch(GITHUB_README_URL, {
      headers: { "User-Agent": "OmniAgent-KeyRotator/1.0" },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      log(`GitHub fetch failed: HTTP ${res.status} — keeping current keys`);
      lastRotationStatus = `failed (HTTP ${res.status})`;
      return false;
    }

    const markdown = await res.text();
    const newKeys = parseReadme(markdown);

    if (Object.keys(newKeys).length === 0) {
      log("No parseable keys found in README — keeping current keys");
      lastRotationStatus = "no keys found";
      return false;
    }

    let updated = 0;
    for (const [envVar, key] of Object.entries(newKeys)) {
      if (key) {
        const preview = `${key.slice(0, 8)}...${key.slice(-4)}`;
        if (process.env[envVar] !== key) {
          process.env[envVar] = key;
          updated++;
          log(`Updated ${envVar} → ${preview}`);
        } else {
          log(`${envVar} unchanged (${preview})`);
        }
      }
    }

    lastRotation = new Date().toISOString();
    lastRotationStatus = `ok — ${updated} key(s) updated`;
    log(`Rotation complete — ${updated} key(s) refreshed`);
    return true;
  } catch (err) {
    log(`Rotation error: ${err.message} — keeping current keys`);
    lastRotationStatus = `error: ${err.message}`;
    return false;
  }
}

/** Start the periodic rotator. Runs once immediately, then every 2 hours. */
export function startKeyRotator() {
  // First rotation after a short delay (let server finish startup)
  setTimeout(() => rotateKeys(), 5000);
  setInterval(() => rotateKeys(), ROTATE_INTERVAL_MS);
  log(
    `Key rotator started — refreshes every ${ROTATE_INTERVAL_MS / 3_600_000}h`
  );
}

/** Status object exposed via /api/keys-status */
export function getRotatorStatus() {
  return {
    lastRotation,
    status: lastRotationStatus,
    nextRotationIn: lastRotation
      ? Math.max(
          0,
          Math.round(
            (new Date(lastRotation).getTime() +
              ROTATE_INTERVAL_MS -
              Date.now()) /
              60000
          )
        ) + "min"
      : "pending",
    recentLog: rotationLog.slice(-10),
  };
}

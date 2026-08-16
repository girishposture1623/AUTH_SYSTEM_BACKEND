const SENSITIVE_KEYS = [
  "password",
  "pass",
  "pwd",
  "token",
  "jwt",
  "secret",
  "key",
  "refresh",
  "api_key",
  "apiKey",
  "apiSecret",
];

function redact(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clone = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    try {
      const v = obj[k];
      const lower = k.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
        clone[k] = "[REDACTED]";
      } else if (typeof v === "object" && v !== null) {
        clone[k] = redact(v);
      } else {
        clone[k] = v;
      }
    } catch (e) {
      // best-effort
      clone[k] = "[REDACTED]";
    }
  }
  return clone;
}

function info(message, meta) {
  if (meta) {
    console.info("[INFO]", message, JSON.stringify(redact(meta)));
  } else {
    console.info("[INFO]", message);
  }
}

function warn(message, meta) {
  if (meta) {
    console.warn("[WARN]", message, JSON.stringify(redact(meta)));
  } else {
    console.warn("[WARN]", message);
  }
}

function error(message, meta) {
  if (meta instanceof Error) {
    console.error("[ERROR]", message, meta.message);
  } else if (meta) {
    console.error("[ERROR]", message, JSON.stringify(redact(meta)));
  } else {
    console.error("[ERROR]", message);
  }
}

export default { info, warn, error, redact };

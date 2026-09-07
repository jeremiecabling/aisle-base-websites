/**
 * ADMIN spreadsheet access: Clients / Themes / Defaults / Ops / Log tabs
 * (HANDOFF §7.2). Everything is addressed BY HEADER NAME, never by column
 * index (§7.3 rule; PROVISIONING.md's swapped-columns bug came from index
 * addressing). Cell values are read as String(cell).trim() except checkboxes
 * (booleans) and dates (Date objects), which Sheets types natively.
 */

var ADMIN_TABS = {
  CLIENTS: "Clients",
  THEMES: "Themes",
  DEFAULTS: "Defaults",
  OPS: "Ops",
  LOG: "Log",
};

var CLIENTS_HEADERS = [
  "slug",
  "status",
  "couple_names",
  "custom_domain",
  "client_sheet_id",
  "rsvp_sheet_id",
  "expires_at",
  "plan",
  "mod_rsvp",
  "mod_gallery_premium",
  "mod_password_gate",
  "mod_things_to_do",
  "gate_password",
  "gate_password_version",
  "theme_preset",
  "gallery_layout",
  "contact_name",
  "contact_phone",
  "etsy_order_id",
  "provisioned_at",
  "notes",
];

var THEMES_HEADERS = [
  "preset",
  "accent_hex",
  "font_display",
  "font_body",
  "bg",
  "bg_alt",
  "text",
  "text_muted",
  "button_bg",
  "radius",
];

function adminSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetOrNull_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name);
}

/**
 * Generic header-addressed table reader: row 1 = headers, blank rows
 * skipped, unknown columns ignored. Returns array of plain objects whose
 * values are raw cell values (callers normalize).
 */
function readTable_(sheet) {
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) {
    return String(h).trim();
  });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var raw = values[r];
    var isBlank = raw.every(function (cell) {
      return cell === "" || cell === null;
    });
    if (isBlank) continue;
    var row = {};
    headers.forEach(function (header, c) {
      if (header) row[header] = raw[c];
    });
    rows.push(row);
  }
  return rows;
}

function str_(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function bool_(value) {
  return value === true || String(value).trim().toUpperCase() === "TRUE";
}

function readClients_() {
  var sheet = getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.CLIENTS);
  return readTable_(sheet)
    .map(function (row) {
      return {
        slug: str_(row.slug).toLowerCase(),
        status: str_(row.status).toLowerCase(),
        couple_names: str_(row.couple_names),
        custom_domain: str_(row.custom_domain),
        client_sheet_id: str_(row.client_sheet_id),
        rsvp_sheet_id: str_(row.rsvp_sheet_id),
        expires_at: coerceDateCell_(row.expires_at),
        // Non-empty but unparseable expiry must be VISIBLE — silently treating
        // it as "no expiry" would fail term enforcement open.
        expires_at_invalid: row.expires_at != null && str_(row.expires_at) !== "" && coerceDateCell_(row.expires_at) === null,
        plan: str_(row.plan),
        mod_rsvp: bool_(row.mod_rsvp),
        mod_gallery_premium: bool_(row.mod_gallery_premium),
        mod_password_gate: bool_(row.mod_password_gate),
        mod_things_to_do: bool_(row.mod_things_to_do),
        gate_password: str_(row.gate_password),
        gate_password_version: coercePasswordVersion_(row.gate_password_version),
        gate_password_version_invalid:
          str_(row.gate_password_version) !== "" && !isFinite(Number(row.gate_password_version)),
        theme_preset: str_(row.theme_preset),
        gallery_layout: str_(row.gallery_layout).toLowerCase(),
        contact_name: str_(row.contact_name),
        contact_phone: str_(row.contact_phone),
      };
    })
    .filter(function (client) {
      return client.slug !== "";
    });
}

/**
 * expires_at as a Date whether the cell is a native Date or text. The date
 * validation on the column is warn-style, so text like "2027-06-12" can be
 * stored — term enforcement must not fail open over a number format. Text
 * parses by parts (never new Date(string): UTC-midnight shifts a day, §5
 * bug 9). Unparseable non-empty values → null + the _invalid flag above.
 */
function coerceDateCell_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str_(value));
  if (!match) return null;
  var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isNaN(date.getTime()) ? null : date;
}

/** Non-negative integer or 1 — a typo must not silently un-rotate cookies. */
function coercePasswordVersion_(value) {
  var n = Number(value);
  return isFinite(n) && n >= 0 ? Math.floor(n) : 1;
}

function findClient_(slug) {
  var clients = readClients_();
  for (var i = 0; i < clients.length; i++) {
    if (clients[i].slug === slug) return clients[i];
  }
  return null;
}

/**
 * Term enforcement (§7.2): a past expires_at serves as expired regardless of
 * the status cell. Computed at read time — no write-back from the serving
 * path (doGet must stay read-only and fast). Applies to the two RENDERING
 * states, active AND staging — staging renders the full site for preview
 * (docs/DECISIONS.md #6), so a forgotten preview must not outlive its term.
 */
function effectiveStatus_(client) {
  var status = client.status || "staging";
  var known = ["active", "paused", "expired", "staging"];
  if (known.indexOf(status) === -1) status = "paused";
  if (
    client.expires_at &&
    client.expires_at.getTime() < Date.now() &&
    (status === "active" || status === "staging")
  ) {
    return "expired";
  }
  return status;
}

/**
 * The live design's terracotta row (HANDOFF §7.2), hardcoded as the
 * last-resort theme so an empty/broken Themes tab is COSMETIC, never an
 * outage. Fonts must stay on the repo's self-hosted OFL whitelist.
 */
var FALLBACK_THEME_ = {
  preset: "terracotta",
  accent_hex: "#F28C52",
  font_display: "Great Vibes",
  font_body: "Cormorant Garamond",
  bg: "#ffffff",
  bg_alt: "#fafaf9",
  text: "#292524",
  text_muted: "#57534e",
  button_bg: "#292524",
  radius: 0,
};

var THEME_FONT_WHITELIST_ = ["Great Vibes", "Allura", "Pinyon Script", "Cormorant Garamond"];

/**
 * Theme resolution: preset row from Themes, validated FIELD BY FIELD against
 * the Next-side themeSchema's rules — any invalid cell substitutes the
 * terracotta fallback value with a warning. A typo (or an empty Themes tab)
 * degrades the look; it never fails the payload and takes tenants down.
 */
function resolveTheme_(presetName, warnings) {
  var rows = readTable_(getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.THEMES));
  var match = null;
  rows.forEach(function (row) {
    if (str_(row.preset).toLowerCase() === presetName.toLowerCase()) match = row;
  });
  if (!match && rows.length > 0) {
    warnings.push('theme preset "' + presetName + '" not found in Themes — using first row');
    match = rows[0];
  }
  if (!match) {
    warnings.push("Themes tab is empty — run bootstrapTemplates(); serving built-in terracotta");
    return FALLBACK_THEME_;
  }

  var hex = function (field) {
    var value = str_(match[field]);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    warnings.push('Themes.' + field + ' "' + value + '" is not #rrggbb — using fallback');
    return FALLBACK_THEME_[field];
  };
  var font = function (field) {
    var value = str_(match[field]);
    if (THEME_FONT_WHITELIST_.indexOf(value) !== -1) return value;
    warnings.push('Themes.' + field + ' "' + value + '" is not a whitelisted font — using fallback');
    return FALLBACK_THEME_[field];
  };
  var radius = Number(match.radius);
  if (!isFinite(radius) || radius < 0) {
    if (str_(match.radius) !== "") warnings.push('Themes.radius "' + str_(match.radius) + '" invalid — using 0');
    radius = 0;
  }

  return {
    preset: str_(match.preset) || FALLBACK_THEME_.preset,
    accent_hex: hex("accent_hex"),
    font_display: font("font_display"),
    font_body: font("font_body"),
    bg: hex("bg"),
    bg_alt: hex("bg_alt"),
    text: hex("text"),
    text_muted: hex("text_muted"),
    button_bg: hex("button_bg"),
    radius: radius,
  };
}

/** Defaults tab → string map (chrome-string overrides, addendum Q17). */
function readDefaultsMap_() {
  var rows = readTable_(getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.DEFAULTS));
  var map = {};
  rows.forEach(function (row) {
    var key = str_(row.key);
    if (key) map[key] = str_(row.value);
  });
  return map;
}

function readOps_(key) {
  var rows = readTable_(getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.OPS));
  for (var i = 0; i < rows.length; i++) {
    if (str_(rows[i].key) === key) return str_(rows[i].value);
  }
  return "";
}

/** Log tab event vocabulary per HANDOFF §7.2. Never throws. */
function logEvent_(slug, event, detail) {
  try {
    var sheet = getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.LOG);
    if (!sheet) return;
    sheet.appendRow([new Date(), slug || "", event, detail || ""]);
  } catch (err) {
    // Logging must never break serving.
  }
}

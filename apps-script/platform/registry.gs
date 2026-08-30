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
        expires_at: row.expires_at instanceof Date ? row.expires_at : null,
        plan: str_(row.plan),
        mod_rsvp: bool_(row.mod_rsvp),
        mod_gallery_premium: bool_(row.mod_gallery_premium),
        mod_password_gate: bool_(row.mod_password_gate),
        mod_things_to_do: bool_(row.mod_things_to_do),
        gate_password: str_(row.gate_password),
        gate_password_version: Number(row.gate_password_version) || 1,
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
 * path (doGet must stay read-only and fast).
 */
function effectiveStatus_(client) {
  var status = client.status || "staging";
  var known = ["active", "paused", "expired", "staging"];
  if (known.indexOf(status) === -1) status = "paused";
  if (client.expires_at && client.expires_at.getTime() < Date.now() && status === "active") {
    return "expired";
  }
  return status;
}

/**
 * Theme resolution: preset row from Themes. A missing/unknown preset falls
 * back to the FIRST theme row with a warning — a typo must degrade the look,
 * not take the site down (the health action surfaces it).
 */
function resolveTheme_(presetName, warnings) {
  var rows = readTable_(getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.THEMES));
  if (rows.length === 0) {
    warnings.push("Themes tab is empty — run bootstrapTemplates()");
    return null;
  }
  var match = null;
  rows.forEach(function (row) {
    if (str_(row.preset).toLowerCase() === presetName.toLowerCase()) match = row;
  });
  if (!match) {
    warnings.push('theme preset "' + presetName + '" not found in Themes — using first row');
    match = rows[0];
  }
  return {
    preset: str_(match.preset),
    accent_hex: str_(match.accent_hex),
    font_display: str_(match.font_display),
    font_body: str_(match.font_body),
    bg: str_(match.bg),
    bg_alt: str_(match.bg_alt),
    text: str_(match.text),
    text_muted: str_(match.text_muted),
    button_bg: str_(match.button_bg),
    radius: Number(match.radius) || 0,
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

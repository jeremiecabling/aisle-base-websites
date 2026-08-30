/**
 * One-time template bootstrap (addendum Q2 hybrid model).
 *
 * The operator runs bootstrapTemplates() ONCE from the Apps Script editor
 * after `clasp push` — it replaces ALL hand-building of tabs. Three jobs:
 *
 *   A. Build the ADMIN tabs in the bound spreadsheet (Clients / Themes /
 *      Defaults / Log / Ops) with headers, dropdowns, checkboxes and notes.
 *   B. Create the CLIENT template spreadsheet and build its tabs FROM
 *      TAB_SCHEMAS (content.gs) — the parser and the sheet share one
 *      declaration and therefore CANNOT drift (the Bug 1 fix, HANDOFF §5).
 *   C. Create the GUEST template spreadsheet (HANDOFF §7.3 + addendum
 *      Q10/Q23b). No RSVP code here — only the sheet shape the RSVP session
 *      will read.
 *
 * SAFELY RE-RUNNABLE by design: a tab is only created when missing, and
 * headers/validation/protection are only written when the tab was JUST
 * created (existing data is never touched). A template whose ID already sits
 * in Ops and still opens is left entirely alone. Missing Ops keys are the one
 * repair-in-place: they are re-seeded because appending a key row can never
 * destroy anything.
 *
 * Run bootstrapStatus() (or Wedding Hub → Bootstrap status) to verify.
 */

/**
 * The gray the couple-facing copy refers to ("don't edit gray cells"):
 * every protected label/header/help cell gets this background so the
 * protection is VISIBLE, not a surprise reject dialog.
 */
var BOOTSTRAP_LOCKED_BG_ = "#f3f0ec";
var BOOTSTRAP_CLIENT_TAB_COLOR_ = "#d9cbb8";
var BOOTSTRAP_GUEST_TAB_COLOR_ = "#b9c8bd";
var BOOTSTRAP_START_HERE_TAB_COLOR_ = "#f28c52";

/** One-sentence explainer per table tab, shown as a note on A1 (spec 7.3). */
var BOOTSTRAP_TABLE_NOTES_ = {
  Schedule: "One row per event; rows with the same day_label group into one accordion day.",
  Travel: "One row per hotel or lodging option — booking_url + button_label power the booking button.",
  "Things To Do": "Local recommendations, one per row — matching categories group together (e.g. Dining, Activities, Drinks).",
  FAQ: "One question per row; two line breaks inside an answer (Ctrl+Enter twice) start a new paragraph.",
  Registry: "One registry card per row — url must start with https:// or the row is skipped.",
  Story: "Your story, one paragraph per row, top to bottom — heading and image_url are optional.",
  Gallery: "One photo per row, in display order — the base plan shows the first 12 (premium shows 40).",
};

/**
 * Entry point. Run from the Apps Script editor (or Wedding Hub menu) as the
 * operator account — that account becomes the owner of both templates, which
 * is what makes owner-only protections survive DriveApp.makeCopy() for every
 * future client copy.
 */
function bootstrapTemplates() {
  var report = [];

  bootstrapAdminTabs_(report);
  bootstrapClientTemplate_(report);
  bootstrapGuestTemplate_(report);

  var summary = report.join("\n");
  Logger.log("bootstrapTemplates:\n" + summary);
  logEvent_("", "bootstrap", report.join(" | "));

  // Editor runs have no UI; menu runs do. Best-effort on both surfaces.
  try {
    SpreadsheetApp.getUi().alert("Bootstrap complete", summary, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    try {
      adminSpreadsheet_().toast("Bootstrap complete — details in the execution log.", "Wedding Hub", 8);
    } catch (ignored) {
      // Headless run — the Logger output above is the report.
    }
  }
  return report;
}

/**
 * Verification for the runbook ("run bootstrapStatus() to verify"): which
 * admin tabs exist, whether the Clients header row still matches
 * CLIENTS_HEADERS, whether the template IDs are filled AND reachable, and
 * whether the onEdit trigger is installed. Logs and returns the report.
 */
function bootstrapStatus() {
  var ss = adminSpreadsheet_();
  var status = {
    script_version: SCRIPT_VERSION,
    admin_tabs: {},
    clients_headers_match: "no Clients tab",
    themes_preset_rows: 0,
    defaults_override_rows: 0,
    templates: {},
    default_cache_seconds: readOps_("default_cache_seconds") || "(blank — 60s fallback)",
    onedit_trigger: "unknown",
  };

  [ADMIN_TABS.CLIENTS, ADMIN_TABS.THEMES, ADMIN_TABS.DEFAULTS, ADMIN_TABS.LOG, ADMIN_TABS.OPS].forEach(
    function (name) {
      status.admin_tabs[name] = ss.getSheetByName(name)
        ? "present"
        : "MISSING — run bootstrapTemplates()";
    }
  );

  var clients = ss.getSheetByName(ADMIN_TABS.CLIENTS);
  if (clients) {
    if (clients.getLastColumn() === 0) {
      status.clients_headers_match = "empty tab — no header row";
    } else {
      var live = clients
        .getRange(1, 1, 1, clients.getLastColumn())
        .getValues()[0]
        .map(function (h) {
          return str_(h);
        });
      var missing = CLIENTS_HEADERS.filter(function (h) {
        return live.indexOf(h) === -1;
      });
      status.clients_headers_match = missing.length === 0 ? true : "missing: " + missing.join(", ");
    }
  }

  status.themes_preset_rows = readTable_(ss.getSheetByName(ADMIN_TABS.THEMES)).length;
  status.defaults_override_rows = readTable_(ss.getSheetByName(ADMIN_TABS.DEFAULTS)).length;

  ["template_client_sheet_id", "template_guest_sheet_id"].forEach(function (key) {
    var id = readOps_(key);
    if (!id) {
      status.templates[key] = "blank — run bootstrapTemplates()";
      return;
    }
    try {
      var template = SpreadsheetApp.openById(id);
      status.templates[key] = "ok: " + template.getName() + " (" + template.getSheets().length + " tabs)";
    } catch (err) {
      status.templates[key] = "UNREACHABLE (" + id + "): " + String(err);
    }
  });

  try {
    status.onedit_trigger = hasHandleAdminEditTrigger_()
      ? "installed"
      : "not installed — Wedding Hub → Install onEdit trigger";
  } catch (err) {
    status.onedit_trigger = "unknown: " + String(err);
  }

  Logger.log("bootstrapStatus:\n" + JSON.stringify(status, null, 2));
  return status;
}

// ---------------------------------------------------------------------------
// JOB A — ADMIN tabs in the bound spreadsheet
// ---------------------------------------------------------------------------

function bootstrapAdminTabs_(report) {
  var ss = adminSpreadsheet_();

  // Themes FIRST: the Clients theme_preset dropdown validates against a
  // range on this tab, so it must exist before buildClientsTab_ runs.
  var themes = ensureSheet_(ss, ADMIN_TABS.THEMES);
  if (themes.created) buildThemesTab_(themes.sheet);
  report.push("Themes tab: " + (themes.created ? "created + seeded 4 presets" : "exists — left alone"));

  var defaults = ensureSheet_(ss, ADMIN_TABS.DEFAULTS);
  if (defaults.created) buildDefaultsTab_(defaults.sheet);
  report.push("Defaults tab: " + (defaults.created ? "created" : "exists — left alone"));

  var log = ensureSheet_(ss, ADMIN_TABS.LOG);
  if (log.created) buildLogTab_(log.sheet);
  report.push("Log tab: " + (log.created ? "created" : "exists — left alone"));

  var ops = ensureSheet_(ss, ADMIN_TABS.OPS);
  if (ops.created) buildOpsTab_(ops.sheet);
  report.push("Ops tab: " + (ops.created ? "created" : "exists — left alone"));
  // The one repair-in-place: appending a missing Ops key can never destroy
  // data, and Jobs B/C depend on the two template_* rows existing.
  ensureOpsKeys_(ops.sheet, report);

  var clients = ensureSheet_(ss, ADMIN_TABS.CLIENTS);
  if (clients.created) buildClientsTab_(clients.sheet);
  report.push("Clients tab: " + (clients.created ? "created" : "exists — left alone"));
}

/** Get-or-insert a tab. `created` gates all header/validation/format writes. */
function ensureSheet_(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  if (sheet) return { sheet: sheet, created: false };
  return { sheet: spreadsheet.insertSheet(name), created: true };
}

function buildClientsTab_(sheet) {
  var ss = adminSpreadsheet_();
  sheet
    .getRange(1, 1, 1, CLIENTS_HEADERS.length)
    .setValues([CLIENTS_HEADERS])
    .setFontWeight("bold");
  sheet.setFrozenRows(1);

  var dataRows = sheet.getMaxRows() - 1;
  // Column positions come from CLIENTS_HEADERS order — this function only
  // ever runs on a tab it JUST wrote in that exact order, so the lookup is
  // header-addressed, never a hardcoded letter.
  var col = function (name) {
    return CLIENTS_HEADERS.indexOf(name) + 1;
  };
  var dataRange = function (name) {
    return sheet.getRange(2, col(name), dataRows, 1);
  };

  dataRange("status").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["active", "paused", "expired", "staging"], true)
      .setAllowInvalid(false)
      .build()
  );
  dataRange("plan").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["basic", "plus", "premium"], true)
      .setAllowInvalid(false)
      .build()
  );
  dataRange("gallery_layout").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(GALLERY_LAYOUTS, true)
      .setAllowInvalid(false)
      .build()
  );

  // Fed by a RANGE, not a snapshot list: new preset rows on Themes appear in
  // the dropdown with zero maintenance.
  var themesSheet = ss.getSheetByName(ADMIN_TABS.THEMES);
  dataRange("theme_preset").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInRange(themesSheet.getRange("A2:A51"), true)
      .setAllowInvalid(false)
      .build()
  );

  // Checkbox VALIDATION (not insertCheckboxes): insertCheckboxes writes
  // FALSE into every cell, which would make getLastRow() 1000 and break
  // appendRow-based provisioning. Validation renders checkboxes in blank
  // cells without writing values.
  var checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build();
  ["mod_rsvp", "mod_gallery_premium", "mod_password_gate", "mod_things_to_do"].forEach(
    function (name) {
      dataRange(name).setDataValidation(checkbox);
    }
  );

  // Warn-style (default allowInvalid) so the script's own Date writes and
  // odd-but-intentional operator entries flag instead of hard-blocking.
  var dateValidation = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setHelpText("Enter a date, e.g. 2027-06-12")
    .build();
  dataRange("expires_at").setDataValidation(dateValidation);
  dataRange("provisioned_at").setDataValidation(dateValidation);

  // Plain text where Sheets coercion loses data: "ana-ben-2027" is fine, but
  // passwords like "1e5", phone leading zeros, and long digit runs are not.
  ["slug", "gate_password", "client_sheet_id", "rsvp_sheet_id", "contact_phone"].forEach(
    function (name) {
      dataRange(name).setNumberFormat("@");
    }
  );

  sheet
    .getRange(1, col("contact_name"))
    .setNote("The COUPLE's preferred contact for guest-facing banners — not you (Q23a)");
  sheet
    .getRange(1, col("plan"))
    .setNote("Bookkeeping only — the mod_* checkboxes are what actually entitle features");
}

function buildThemesTab_(sheet) {
  sheet
    .getRange(1, 1, 1, THEMES_HEADERS.length)
    .setValues([THEMES_HEADERS])
    .setFontWeight("bold");
  sheet.setFrozenRows(1);

  // Fonts MUST stay on the self-hosted OFL whitelist (HANDOFF §6): display =
  // Great Vibes / Allura / Pinyon Script, body = Cormorant Garamond.
  // terracotta stays row 2: resolveTheme_ falls back to the FIRST preset row,
  // so the live design is also the safety net.
  var presets = [
    ["terracotta", "#F28C52", "Great Vibes", "Cormorant Garamond", "#ffffff", "#fafaf9", "#292524", "#57534e", "#292524", 0],
    ["sage", "#8A9A5B", "Allura", "Cormorant Garamond", "#ffffff", "#f6f7f2", "#2d3126", "#5b6152", "#2d3126", 0],
    ["noir", "#C9A961", "Pinyon Script", "Cormorant Garamond", "#ffffff", "#f7f7f7", "#1c1c1c", "#555555", "#1c1c1c", 0],
    ["blush", "#D98E8E", "Great Vibes", "Cormorant Garamond", "#ffffff", "#fbf7f7", "#33272a", "#6b5a5e", "#33272a", 0],
  ];
  sheet.getRange(2, 1, presets.length, THEMES_HEADERS.length).setValues(presets);
  sheet.getRange(1, 1).setNote("terracotta IS the live site's design. Fonts must come from the repo's self-hosted OFL whitelist: Great Vibes, Allura, Pinyon Script, Cormorant Garamond.");
}

function buildDefaultsTab_(sheet) {
  sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet
    .getRange(1, 1)
    .setNote("Optional guest-facing string overrides — keys from lib/chrome.ts; e.g. Spanish labels");

  // Two examples only, NOT every CHROME_DEFAULTS key (addendum Q17 — the
  // code's defaults are the source of truth; a row here merely overrides).
  // Values equal the shipped English defaults, so seeding is behavior-neutral.
  sheet.getRange(2, 1, 2, 2).setValues([
    ["gate_prompt", "Please enter the password to view our wedding website"],
    ["countdown_today", "Today's the day!"],
  ]);
  sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1).setNumberFormat("@");
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 420);
}

function buildLogTab_(sheet) {
  sheet
    .getRange(1, 1, 1, 4)
    .setValues([["timestamp", "slug", "event", "detail"]])
    .setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(4, 420);
}

function buildOpsTab_(sheet) {
  sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(2, 420);
  // Key rows are seeded by ensureOpsKeys_, which runs on EVERY bootstrap so
  // a hand-deleted row heals; values already present are never overwritten.
}

function ensureOpsKeys_(sheet, report) {
  var seeds = [
    ["template_client_sheet_id", ""], // Job B fills this
    ["template_guest_sheet_id", ""], // Job C fills this
    ["default_cache_seconds", 60],
  ];
  seeds.forEach(function (seed) {
    if (opsRowIndex_(sheet, seed[0]) === -1) {
      sheet.appendRow(seed);
      report.push('Ops: seeded missing key "' + seed[0] + '"');
    }
  });
}

/** 1-based row of an Ops key, or -1. Col A is the key column by construction. */
function opsRowIndex_(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (str_(keys[i][0]) === key) return i + 2;
  }
  return -1;
}

function setOpsValue_(key, value) {
  var sheet = getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.OPS);
  if (!sheet) throw new Error("Ops tab missing — bootstrapAdminTabs_ must run first");
  var row = opsRowIndex_(sheet, key);
  if (row === -1) {
    sheet.appendRow([key, value]);
  } else {
    sheet.getRange(row, 2).setValue(value);
  }
}

// ---------------------------------------------------------------------------
// JOB B — CLIENT template spreadsheet, built FROM TAB_SCHEMAS
// ---------------------------------------------------------------------------

function bootstrapClientTemplate_(report) {
  var existingId = readOps_("template_client_sheet_id");
  if (existingId && templateReachable_(existingId)) {
    report.push("CLIENT template: exists (" + existingId + ") — left alone");
    return;
  }
  if (existingId) {
    report.push("CLIENT template: Ops ID " + existingId + " is unreachable — creating a fresh one");
  }

  var ss = SpreadsheetApp.create("CLIENT TEMPLATE — Aisle Base");

  // The default "Sheet1" becomes Start Here so the instructions are the
  // first tab a couple lands on.
  var startHere = ss.getSheets()[0];
  startHere.setName("📖 Start Here");
  buildStartHereTab_(startHere);
  startHere.setTabColor(BOOTSTRAP_START_HERE_TAB_COLOR_);

  // Every content tab comes straight from TAB_SCHEMAS (content.gs). Adding a
  // tab/key/header there and re-running bootstrap on a fresh template is the
  // ONLY way the sheet shape changes — parser and sheet cannot drift.
  Object.keys(TAB_SCHEMAS).forEach(function (tabName) {
    var schema = TAB_SCHEMAS[tabName];
    var sheet = ss.insertSheet(tabName);
    if (schema.type === "kv") {
      buildKvTab_(sheet, schema);
    } else {
      buildTableTab_(sheet, tabName, schema);
    }
    sheet.setTabColor(BOOTSTRAP_CLIENT_TAB_COLOR_);
  });

  setOpsValue_("template_client_sheet_id", ss.getId());
  logEvent_("", "bootstrap", "client template created: " + ss.getId());
  report.push("CLIENT template: created — " + ss.getUrl());
}

/**
 * Fully protected instructions tab (addendum Q2/Q14). Warning-only is not
 * enough for the one tab whose whole job is "read, don't touch": the
 * protection is owner-only, so couples (file editors on the copy) can only
 * read it.
 */
function buildStartHereTab_(sheet) {
  var lines = [
    ["📖 Start Here", "title"],
    ["This spreadsheet IS your wedding website. Everything you type here shows up on your site automatically.", "body"],
    ["", ""],
    ["HOW IT WORKS", "h"],
    ["• Basics tab: fill in the white “Your value” column.", "body"],
    ["• Every other tab: one item per row under the bold headers. Type into the empty rows — blank rows are simply skipped.", "body"],
    ["• Your edits are live in about 3 minutes. No save button, no publishing, nothing to send us.", "body"],
    ["", ""],
    ["PLEASE DON'T", "h"],
    ["• Don't rename the tabs — your website finds each section by its tab name.", "body"],
    ["• Don't edit gray cells (labels, headers, help text) — they're locked on purpose. The white cells are all yours.", "body"],
    ["", ""],
    ["ADDING PHOTOS", "h"],
    ["Google Drive: upload the photo → right-click it → Share → set “Anyone with the link” → Copy link → paste that link into the sheet.", "body"],
    ["Any direct image URL (a web link ending in .jpg, .png, or .webp) also works — and is the most reliable option.", "body"],
    ["", ""],
    ["THE PASSWORD-PAGE VIDEO", "h"],
    ["The gate video is handled by us — send us your clip and we upload it and fill in the link for you. You never touch gate_video_url.", "body"],
    ["", ""],
    ["Questions? Just reply to your welcome email — happy to help.", "body"],
  ];

  sheet.getRange(1, 1, lines.length, 1).setValues(
    lines.map(function (line) {
      return [line[0]];
    })
  );
  sheet
    .getRange(1, 1, lines.length, 4)
    .mergeAcross()
    .setWrap(true)
    .setVerticalAlignment("top");
  sheet.setColumnWidths(1, 4, 190);
  lines.forEach(function (line, i) {
    if (line[1] === "title") sheet.getRange(i + 1, 1).setFontSize(16).setFontWeight("bold");
    if (line[1] === "h") sheet.getRange(i + 1, 1).setFontWeight("bold");
  });
  sheet.setHiddenGridlines(true);
  try {
    sheet.autoResizeRows(1, lines.length);
  } catch (err) {
    // Best-effort: merged-cell auto-resize is cosmetic.
  }

  var protection = sheet.protect().setDescription("Start Here — read-only instructions");
  lockProtection_(protection);
}

/**
 * Locked-KV tab (HANDOFF §7.3): col A key + col C help protected, col B the
 * couple's. Implemented the clean way — protect the WHOLE sheet, unprotect
 * exactly the value cells — so new rows, the header, and the empty area are
 * all covered by one protection.
 */
function buildKvTab_(sheet, schema) {
  // "# " keys are skipped by readKvTab_ (content.gs), so this human header
  // row is invisible to the parser by convention, not by special-casing.
  sheet
    .getRange(1, 1, 1, 3)
    .setValues([["# Setting", "Your value", "# Help — what goes here"]])
    .setFontWeight("bold")
    .setBackground(BOOTSTRAP_LOCKED_BG_);
  sheet.setFrozenRows(1);

  var rows = schema.keys.map(function (def) {
    return [def.key, "", def.help || ""];
  });
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  sheet
    .getRange(2, 1, rows.length, 1)
    .setFontWeight("bold")
    .setBackground(BOOTSTRAP_LOCKED_BG_);
  sheet.getRange(2, 3, rows.length, 1).setBackground(BOOTSTRAP_LOCKED_BG_).setWrap(true);

  // Whole value column plain text: dates/phone-ish strings must reach the
  // parser exactly as typed — String(cell).trim() is the contract.
  var valueColumn = sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1);
  valueColumn.setNumberFormat("@").setWrap(true);

  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 420);
  sheet.setColumnWidth(3, 480);

  var protection = sheet
    .protect()
    .setDescription("Labels and help text are locked — type in the white “Your value” cells");
  protection.setUnprotectedRanges([sheet.getRange(2, 2, rows.length, 1)]);
  lockProtection_(protection);
}

/**
 * Table tab: row 1 = schema.headers verbatim (readTableTab_ addresses cells
 * by these names). Whole-sheet protection with the data block unprotected
 * keeps the header row AND the area right of the table locked.
 */
function buildTableTab_(sheet, tabName, schema) {
  sheet
    .getRange(1, 1, 1, schema.headers.length)
    .setValues([schema.headers])
    .setFontWeight("bold")
    .setBackground(BOOTSTRAP_LOCKED_BG_);
  sheet.setFrozenRows(1);
  if (BOOTSTRAP_TABLE_NOTES_[tabName]) {
    sheet.getRange(1, 1).setNote(BOOTSTRAP_TABLE_NOTES_[tabName]);
  }

  var dataRows = sheet.getMaxRows() - 1;
  var dataRange = sheet.getRange(2, 1, dataRows, schema.headers.length);
  dataRange.setNumberFormat("@");
  sheet.setColumnWidths(1, schema.headers.length, 180);

  var protection = sheet
    .protect()
    .setDescription("Headers are locked — add your rows in the white cells below");
  protection.setUnprotectedRanges([dataRange]);
  lockProtection_(protection);
}

// ---------------------------------------------------------------------------
// JOB C — GUEST template spreadsheet (HANDOFF §7.3 + addendum Q10/Q23b)
// ---------------------------------------------------------------------------

function bootstrapGuestTemplate_(report) {
  var existingId = readOps_("template_guest_sheet_id");
  if (existingId && templateReachable_(existingId)) {
    report.push("GUEST template: exists (" + existingId + ") — left alone");
    return;
  }
  if (existingId) {
    report.push("GUEST template: Ops ID " + existingId + " is unreachable — creating a fresh one");
  }

  var ss = SpreadsheetApp.create("GUEST TEMPLATE — Aisle Base");

  var guestList = ss.getSheets()[0];
  guestList.setName("GuestList");
  buildGuestListTab_(guestList);
  guestList.setTabColor(BOOTSTRAP_GUEST_TAB_COLOR_);

  var settings = ss.insertSheet("Settings");
  buildGuestSettingsTab_(settings);
  settings.setTabColor(BOOTSTRAP_GUEST_TAB_COLOR_);

  var rsvpLog = ss.insertSheet("RSVPLog");
  buildRsvpLogTab_(rsvpLog);
  rsvpLog.setTabColor(BOOTSTRAP_GUEST_TAB_COLOR_);

  setOpsValue_("template_guest_sheet_id", ss.getId());
  logEvent_("", "bootstrap", "guest template created: " + ss.getId());
  report.push("GUEST template: created — " + ss.getUrl());
}

function buildGuestListTab_(sheet) {
  // invite_code stays for ops even though code lookup is dropped from the
  // RSVP UI (addendum Q23b). The RSVP session addresses every column by
  // header NAME — this row is the contract.
  var headers = [
    "party_id",
    "guest_id",
    "first_name",
    "last_name",
    "email",
    "phone",
    "invite_code",
    "is_child",
    "is_baby",
    "is_plus_one",
    "rsvp_welcome_party",
    "rsvp_wedding",
    "meal_choice",
    "dietary_restrictions",
    "rsvp_timestamp",
  ];
  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground(BOOTSTRAP_LOCKED_BG_);
  sheet.setFrozenRows(1);
  sheet
    .getRange(1, 1)
    .setNote(
      "One guest per row; party_id groups the guests who RSVP together. The RSVP backend reads columns by these header names — don't rename them."
    );

  var dataRows = sheet.getMaxRows() - 1;
  var col = function (name) {
    return headers.indexOf(name) + 1;
  };

  // Plain text where Sheets would mangle input: phone formatting/leading
  // zeros, name capitalization ("apostrophes" etc.), zero-padded codes.
  ["first_name", "last_name", "phone", "invite_code"].forEach(function (name) {
    sheet.getRange(2, col(name), dataRows, 1).setNumberFormat("@");
  });

  var checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build();
  ["is_child", "is_baby", "is_plus_one"].forEach(function (name) {
    sheet.getRange(2, col(name), dataRows, 1).setDataValidation(checkbox);
  });

  // Header ROW protection only (not the whole sheet): couples own their
  // guest data and may insert/delete rows freely — only the column contract
  // is locked.
  var protection = sheet
    .getRange(1, 1, 1, headers.length)
    .protect()
    .setDescription("GuestList header row — locked (the RSVP backend addresses columns by name)");
  lockProtection_(protection);
}

function buildGuestSettingsTab_(sheet) {
  var rows = [
    ["rsvp_locked", "", "Tick to close RSVPs — guests see your locked message instead of the form"],
    ["rsvp_deadline", "", "YYYY-MM-DD — the one true deadline, shown to guests (leave blank for none)"],
    ["meal_options", "", "Comma-separated list of dinner choices, e.g. Beef, Salmon, Vegetarian"],
    ["locked_message", "", "What guests see once RSVPs are closed"],
    ["welcome_party_enabled", "", "Un-check if you're not hosting a welcome party — the question disappears from RSVP"],
  ];

  sheet
    .getRange(1, 1, 1, 3)
    .setValues([["# Setting", "Your value", "# Help — what goes here"]])
    .setFontWeight("bold")
    .setBackground(BOOTSTRAP_LOCKED_BG_);
  sheet.setFrozenRows(1);
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  sheet
    .getRange(2, 1, rows.length, 1)
    .setFontWeight("bold")
    .setBackground(BOOTSTRAP_LOCKED_BG_);
  sheet.getRange(2, 3, rows.length, 1).setBackground(BOOTSTRAP_LOCKED_BG_).setWrap(true);
  sheet.getRange(2, 2, rows.length, 1).setNumberFormat("@");

  var checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build();
  // rsvp_locked = row 2, welcome_party_enabled = row 6 (per the rows array).
  sheet.getRange(2, 2).setDataValidation(checkbox).setValue(false);
  // Default ON (addendum Q10): the fixed-two-events v1 model assumes a
  // welcome party unless the couple opts out.
  sheet.getRange(6, 2).setDataValidation(checkbox).setValue(true);

  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(2, 320);
  sheet.setColumnWidth(3, 480);

  var protection = sheet
    .protect()
    .setDescription("Settings — edit only the “Your value” column");
  protection.setUnprotectedRanges([sheet.getRange(2, 2, rows.length, 1)]);
  lockProtection_(protection);
}

function buildRsvpLogTab_(sheet) {
  sheet
    .getRange(1, 1, 1, 4)
    .setValues([["timestamp", "party_id", "actor", "detail"]])
    .setFontWeight("bold")
    .setBackground(BOOTSTRAP_LOCKED_BG_);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1).setNote("Script-appended audit trail of every RSVP save — nothing to edit here.");
  sheet.setColumnWidth(4, 420);

  // Whole sheet locked: it is an audit trail. The RSVP web app executes as
  // the operator (the owner), so script appends still work; couples can read
  // but not rewrite history.
  var protection = sheet.protect().setDescription("RSVPLog — script-written audit trail");
  lockProtection_(protection);
}

// ---------------------------------------------------------------------------
// Shared protection/reachability helpers
// ---------------------------------------------------------------------------

/**
 * Owner-only lock. The spreadsheet OWNER always edits through protections —
 * which is exactly the model: the operator owns the templates and every
 * makeCopy() of them; couples are added as file editors and can touch only
 * unprotected ranges. (This is Google's own documented idiom.)
 */
function lockProtection_(protection) {
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
}

/** True when the ID opens as a spreadsheet for this account. */
function templateReachable_(id) {
  try {
    SpreadsheetApp.openById(id);
    return true;
  } catch (err) {
    return false;
  }
}

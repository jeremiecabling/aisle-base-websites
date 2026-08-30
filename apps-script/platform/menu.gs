/**
 * "Wedding Hub" operator menu (HANDOFF §7.4 menu spec + §7.5 runbook step 1).
 *
 * NAMING NOTE: every function a menu item or google.script.run invokes MUST
 * be public (no trailing underscore) — Apps Script treats underscore-suffixed
 * functions as private and refuses to dispatch them from menus and from
 * google.script.run. That is why the entry points below (showNewClientDialog,
 * menuFlushClient, createClient, …) break the private-helper convention:
 * they are, by definition, the script's UI surface.
 *
 * Everything Clients-related is header-addressed against the LIVE row 1
 * (which bootstrapTemplates() wrote from CLIENTS_HEADERS) — never a hardcoded
 * column letter (§7.3 rule; the swapped-columns bug came from index math).
 */

/** Plan → auto-ticked entitlements (addendum Q21). Checkboxes stay the source of truth. */
var PLAN_MOD_PRESETS_ = {
  basic: [],
  plus: ["mod_rsvp", "mod_password_gate"],
  premium: ["mod_rsvp", "mod_password_gate", "mod_things_to_do", "mod_gallery_premium"],
};

/**
 * Simple trigger — builds the menu on every open of the ADMIN sheet. Runs in
 * AuthMode.LIMITED, so it must only build UI (no Drive/Properties calls here).
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Wedding Hub")
    .addItem("New Client…", "showNewClientDialog")
    .addItem("Flush cache for client…", "menuFlushClient")
    .addItem("Flush ALL caches", "menuFlushAll")
    .addItem("Rotate gate password version…", "menuRotateGateVersion")
    .addSeparator()
    .addItem("Install onEdit trigger", "menuInstallOnEditTrigger")
    .addItem("Bootstrap templates (one-time)", "bootstrapTemplates")
    .addItem("Bootstrap status", "menuBootstrapStatus")
    .addToUi();
}

// ---------------------------------------------------------------------------
// New Client (provisioning dialog — HANDOFF §7.5 step 1, target ~2 min)
// ---------------------------------------------------------------------------

function showNewClientDialog() {
  var ui = SpreadsheetApp.getUi();
  try {
    // Fail BEFORE showing the form when bootstrap hasn't run — a dialog that
    // errors on submit is worse than one that refuses to open with the fix.
    var presets = readTable_(getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.THEMES))
      .map(function (row) {
        return str_(row.preset);
      })
      .filter(function (name) {
        return name !== "";
      });
    if (presets.length === 0) {
      throw new Error("Themes tab is empty — run bootstrapTemplates() first.");
    }
    if (!readOps_("template_client_sheet_id") || !readOps_("template_guest_sheet_id")) {
      throw new Error("Template sheet IDs missing from Ops — run bootstrapTemplates() first.");
    }

    var output = HtmlService.createHtmlOutput(newClientDialogHtml_(presets))
      .setWidth(480)
      .setHeight(720);
    ui.showModalDialog(output, "New Client");
  } catch (err) {
    ui.alert("New Client failed: " + (err && err.message ? err.message : String(err)));
  }
}

/**
 * Server-side provisioning — the google.script.run target of the dialog.
 * Copies both templates, shares with the couple, appends the Clients row
 * (status "staging"), flushes cache, logs, returns a summary for the dialog.
 */
function createClient(form) {
  form = form || {};

  // 1. Re-validate the slug server-side — the dialog's regex is a courtesy,
  //    this is the wall.
  var slug = str_(form.slug).toLowerCase();
  if (!isValidSlug_(slug)) {
    throw new Error('Invalid slug "' + slug + '" — lowercase letters, digits and hyphens only.');
  }
  if (findClient_(slug)) {
    throw new Error('Slug "' + slug + '" already exists in Clients.');
  }

  // 2. Copy BOTH templates (IDs live in Ops, filled by bootstrapTemplates()).
  var clientTemplateId = readOps_("template_client_sheet_id");
  var guestTemplateId = readOps_("template_guest_sheet_id");
  if (!clientTemplateId || !guestTemplateId) {
    throw new Error("Template sheet IDs missing from Ops — run bootstrapTemplates() first.");
  }

  var warnings = [];
  var coupleNames = str_(form.couple_names) || slug;
  var clientCopy = DriveApp.getFileById(clientTemplateId).makeCopy(coupleNames + " — Website Content");
  var guestCopy = DriveApp.getFileById(guestTemplateId).makeCopy(coupleNames + " — Guest List");

  // 3. Share as EDITOR. Sharing failure is a warning, not a rollback — the
  //    operator can share by hand; the provisioned row must survive.
  var email = str_(form.couple_email);
  if (email) {
    try {
      clientCopy.addEditor(email);
      guestCopy.addEditor(email);
    } catch (err) {
      warnings.push("Sharing with " + email + " failed — share both sheets manually. (" + String(err) + ")");
    }
  } else {
    warnings.push("No couple email given — share both sheets manually.");
  }

  var plan = str_(form.plan).toLowerCase();
  if (["basic", "plus", "premium"].indexOf(plan) === -1) plan = "basic";

  var themePreset = str_(form.theme_preset);
  var themeWarnings = [];
  resolveTheme_(themePreset, themeWarnings); // validates against Themes; falls back loudly
  warnings = warnings.concat(themeWarnings);

  var mods = {
    mod_rsvp: form.mod_rsvp === true,
    mod_password_gate: form.mod_password_gate === true,
    mod_things_to_do: form.mod_things_to_do === true,
    mod_gallery_premium: form.mod_gallery_premium === true,
  };
  var gatePassword = mods.mod_password_gate ? friendlyPassword_() : "";

  var expiresAt = parseIsoDate_(str_(form.expires_at));
  if (!expiresAt) {
    warnings.push("No/invalid term end date — expires_at left blank (term enforcement is OFF for this client).");
  }

  // 4. Append the Clients row, header-addressed against live row 1.
  appendClientsRow_({
    slug: slug,
    status: "staging",
    couple_names: str_(form.couple_names),
    custom_domain: str_(form.custom_domain).toLowerCase(),
    client_sheet_id: clientCopy.getId(),
    rsvp_sheet_id: guestCopy.getId(),
    expires_at: expiresAt || "",
    plan: plan,
    mod_rsvp: mods.mod_rsvp,
    mod_gallery_premium: mods.mod_gallery_premium,
    mod_password_gate: mods.mod_password_gate,
    mod_things_to_do: mods.mod_things_to_do,
    gate_password: gatePassword,
    gate_password_version: 1,
    theme_preset: themePreset,
    gallery_layout: "grid",
    contact_name: str_(form.contact_name),
    contact_phone: str_(form.contact_phone),
    etsy_order_id: str_(form.etsy_order_id),
    provisioned_at: new Date(),
    notes: "",
  });

  // 5. Cache + audit trail.
  flushClientCache_(slug);
  logEvent_(
    slug,
    "provisioned",
    "plan=" +
      plan +
      " mods=" +
      Object.keys(mods)
        .filter(function (name) {
          return mods[name];
        })
        .join(",") +
      " shared_with=" +
      (email || "(none)") +
      " via New Client dialog"
  );

  // 6. Summary for the dialog.
  return {
    ok: true,
    slug: slug,
    client_sheet_url: clientCopy.getUrl(),
    guest_sheet_url: guestCopy.getUrl(),
    gate_password: gatePassword,
    warnings: warnings,
    reminder: 'Row created with status "staging" — flip it to "active" when the site is ready.',
  };
}

/** Dialog markup, built server-side so theme presets and plan presets are injected once. */
function newClientDialogHtml_(presetNames) {
  var themeOptions = presetNames
    .map(function (name) {
      return '<option value="' + htmlEscape_(name) + '">' + htmlEscape_(name) + "</option>";
    })
    .join("");
  var planOptions = ["basic", "plus", "premium"]
    .map(function (name) {
      return '<option value="' + name + '">' + name + "</option>";
    })
    .join("");

  return [
    "<style>",
    "  body { font: 13px/1.45 Arial, sans-serif; margin: 0; padding: 16px; color: #292524; }",
    "  label { display: block; margin: 10px 0 2px; font-weight: bold; }",
    "  input[type=text], input[type=email], input[type=date], select { width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #d6d3d1; }",
    "  .checks label { display: inline-block; font-weight: normal; margin: 6px 14px 0 0; }",
    "  .hint { color: #78716c; font-size: 11px; margin: 2px 0 0; }",
    "  button { margin-top: 14px; padding: 8px 18px; background: #292524; color: #fff; border: 0; cursor: pointer; }",
    "  button[disabled] { opacity: 0.5; }",
    "  #status { margin-top: 10px; }",
    "  #status.error { color: #b91c1c; }",
    "  #result { display: none; }",
    "  #result code { background: #f5f5f4; padding: 1px 4px; }",
    "</style>",
    '<div id="form">',
    "  <label>Slug (the subdomain) *</label>",
    '  <input type="text" id="slug" placeholder="ana-ben-2027">',
    '  <p class="hint">Lowercase letters, digits, hyphens — becomes &lt;slug&gt;.sites.&lt;brand&gt;.com.</p>',
    "  <label>Couple names *</label>",
    '  <input type="text" id="couple_names" placeholder="Ana &amp; Ben">',
    "  <label>Couple email (shared as editor on both sheets)</label>",
    '  <input type="email" id="couple_email">',
    "  <label>Term end date (expires_at)</label>",
    '  <input type="date" id="expires_at">',
    "  <label>Plan</label>",
    '  <select id="plan">' + planOptions + "</select>",
    '  <p class="hint">Bookkeeping only — the checkboxes below actually entitle features (auto-ticked from the plan, edit freely).</p>',
    '  <div class="checks">',
    '    <label><input type="checkbox" id="mod_rsvp"> RSVP</label>',
    '    <label><input type="checkbox" id="mod_password_gate"> Password gate</label>',
    '    <label><input type="checkbox" id="mod_things_to_do"> Things to Do</label>',
    '    <label><input type="checkbox" id="mod_gallery_premium"> Premium gallery</label>',
    "  </div>",
    "  <label>Theme preset</label>",
    '  <select id="theme_preset">' + themeOptions + "</select>",
    "  <label>Contact name (the COUPLE's — for guest-facing banners)</label>",
    '  <input type="text" id="contact_name">',
    "  <label>Contact phone (the COUPLE's)</label>",
    '  <input type="text" id="contact_phone">',
    "  <label>Custom domain (optional)</label>",
    '  <input type="text" id="custom_domain" placeholder="anaandben.com">',
    "  <label>Etsy order id (optional)</label>",
    '  <input type="text" id="etsy_order_id">',
    '  <button id="create" onclick="submitForm()">Create client</button>',
    "</div>",
    '<div id="status"></div>',
    '<div id="result"></div>',
    "<script>",
    "  var PLAN_PRESETS = " + JSON.stringify(PLAN_MOD_PRESETS_) + ";",
    "  var MODS = ['mod_rsvp', 'mod_password_gate', 'mod_things_to_do', 'mod_gallery_premium'];",
    "  function $(id) { return document.getElementById(id); }",
    "  function esc(value) { var d = document.createElement('div'); d.textContent = value == null ? '' : String(value); return d.innerHTML; }",
    "  function applyPlan() { var mods = PLAN_PRESETS[$('plan').value] || []; MODS.forEach(function (m) { $(m).checked = mods.indexOf(m) !== -1; }); }",
    "  $('plan').onchange = applyPlan;",
    "  applyPlan();",
    "  function showStatus(msg, isError) { var el = $('status'); el.textContent = msg; el.className = isError ? 'error' : ''; }",
    "  function submitForm() {",
    "    var slug = $('slug').value.trim().toLowerCase();",
    "    if (!/^[a-z0-9-]{1,63}$/.test(slug)) { showStatus('Slug must be 1-63 lowercase letters, digits, or hyphens.', true); return; }",
    "    if (!$('couple_names').value.trim()) { showStatus('Couple names is required (it names their two sheets).', true); return; }",
    "    $('create').disabled = true;",
    "    showStatus('Provisioning\\u2026 copying two template sheets takes ~15 seconds.', false);",
    "    var form = {",
    "      slug: slug,",
    "      couple_names: $('couple_names').value,",
    "      couple_email: $('couple_email').value.trim(),",
    "      expires_at: $('expires_at').value,",
    "      plan: $('plan').value,",
    "      theme_preset: $('theme_preset').value,",
    "      contact_name: $('contact_name').value,",
    "      contact_phone: $('contact_phone').value,",
    "      custom_domain: $('custom_domain').value.trim(),",
    "      etsy_order_id: $('etsy_order_id').value.trim()",
    "    };",
    "    MODS.forEach(function (m) { form[m] = $(m).checked; });",
    "    google.script.run.withSuccessHandler(showResult).withFailureHandler(showError).createClient(form);",
    "  }",
    "  function showError(err) { $('create').disabled = false; showStatus('Failed: ' + ((err && err.message) || err), true); }",
    "  function showResult(res) {",
    "    $('form').style.display = 'none';",
    "    showStatus('', false);",
    "    var html = '<h3>' + esc(res.slug) + ' provisioned (status: staging)</h3>' +",
    "      '<p><a href=\"' + esc(res.client_sheet_url) + '\" target=\"_blank\">Website content sheet</a><br>' +",
    "      '<a href=\"' + esc(res.guest_sheet_url) + '\" target=\"_blank\">Guest list sheet</a></p>' +",
    "      '<p>Gate password: ' + (res.gate_password ? '<code>' + esc(res.gate_password) + '</code>' : '\\u2014 (no password gate)') + '</p>';",
    "    if (res.warnings && res.warnings.length) { html += '<p><b>Warnings:</b><br>' + res.warnings.map(esc).join('<br>') + '</p>'; }",
    "    html += '<p><b>' + esc(res.reminder) + '</b></p>';",
    "    var el = $('result'); el.innerHTML = html; el.style.display = 'block';",
    "  }",
    "</script>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Cache + gate maintenance
// ---------------------------------------------------------------------------

function menuFlushClient() {
  var ui = SpreadsheetApp.getUi();
  try {
    var slug = promptForSlug_(ui, "Flush cache for client", "");
    if (slug === null) return;
    flushClientCache_(slug);
    adminSpreadsheet_().toast("Flushed cfg:" + slug + " + domains.", "Wedding Hub", 5);
  } catch (err) {
    ui.alert("Flush failed: " + (err && err.message ? err.message : String(err)));
  }
}

function menuFlushAll() {
  var ui = SpreadsheetApp.getUi();
  try {
    var keys = flushAllCache_();
    adminSpreadsheet_().toast("Flushed " + keys.length + " cache keys.", "Wedding Hub", 5);
  } catch (err) {
    ui.alert("Flush ALL failed: " + (err && err.message ? err.message : String(err)));
  }
}

/**
 * Bumping gate_password_version invalidates EVERY issued gate cookie for the
 * tenant (the Next side signs v2.<slug>.<pwVersion>.<exp> — HANDOFF §7.1).
 * Use after rotating/leaking a gate password.
 */
function menuRotateGateVersion() {
  var ui = SpreadsheetApp.getUi();
  try {
    var slug = promptForSlug_(
      ui,
      "Rotate gate password version",
      "This invalidates every guest's gate cookie for the site."
    );
    if (slug === null) return;

    var sheet = getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.CLIENTS);
    if (!sheet) throw new Error("Clients tab missing — run bootstrapTemplates() first.");
    var slugCol = headerColumn_(sheet, "slug");
    var versionCol = headerColumn_(sheet, "gate_password_version");

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No client rows yet.");
    var slugs = sheet.getRange(2, slugCol, lastRow - 1, 1).getValues();
    for (var i = 0; i < slugs.length; i++) {
      if (str_(slugs[i][0]).toLowerCase() !== slug) continue;
      var cell = sheet.getRange(i + 2, versionCol);
      var next = (Number(cell.getValue()) || 1) + 1;
      cell.setValue(next);
      flushClientCache_(slug);
      logEvent_(slug, "gate_version_rotated", "gate_password_version=" + next);
      adminSpreadsheet_().toast(
        '"' + slug + '" gate_password_version → ' + next + " — all gate cookies invalidated, cache flushed.",
        "Wedding Hub",
        8
      );
      return;
    }
    throw new Error('No Clients row with slug "' + slug + '".');
  } catch (err) {
    ui.alert("Rotate failed: " + (err && err.message ? err.message : String(err)));
  }
}

// ---------------------------------------------------------------------------
// Trigger install + status
// ---------------------------------------------------------------------------

/**
 * Installs the INSTALLABLE onEdit trigger for handleAdminEdit (triggers.gs).
 * Idempotent: a second run toasts and does nothing — duplicate triggers would
 * double-flush on every admin edit.
 */
function menuInstallOnEditTrigger() {
  var ui = SpreadsheetApp.getUi();
  try {
    if (hasHandleAdminEditTrigger_()) {
      adminSpreadsheet_().toast("onEdit trigger already installed — nothing to do.", "Wedding Hub", 5);
      return;
    }
    ScriptApp.newTrigger("handleAdminEdit").forSpreadsheet(adminSpreadsheet_()).onEdit().create();
    adminSpreadsheet_().toast("Installed onEdit trigger → handleAdminEdit.", "Wedding Hub", 5);
  } catch (err) {
    ui.alert("Trigger install failed: " + (err && err.message ? err.message : String(err)));
  }
}

function hasHandleAdminEditTrigger_() {
  return ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === "handleAdminEdit";
  });
}

function menuBootstrapStatus() {
  var ui = SpreadsheetApp.getUi();
  try {
    var status = bootstrapStatus();
    ui.alert("Bootstrap status", JSON.stringify(status, null, 2), ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("Bootstrap status failed: " + (err && err.message ? err.message : String(err)));
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** ui.prompt for a slug; null on cancel; throws on an invalid slug. */
function promptForSlug_(ui, title, note) {
  var response = ui.prompt(title, (note ? note + "\n\n" : "") + "Client slug:", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return null;
  var slug = str_(response.getResponseText()).toLowerCase();
  if (!isValidSlug_(slug)) {
    throw new Error('"' + slug + '" is not a valid slug (lowercase letters, digits, hyphens).');
  }
  return slug;
}

/**
 * 1-based column of a header in the LIVE Clients row 1. Live, not
 * CLIENTS_HEADERS positions, so a reordered (but not renamed) column keeps
 * working; a missing header fails loudly instead of writing the wrong cell.
 */
function headerColumn_(sheet, headerName) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) throw new Error(sheet.getName() + " has no header row — run bootstrapTemplates() first.");
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (h) {
    return str_(h);
  });
  var index = headers.indexOf(headerName);
  if (index === -1) {
    throw new Error(sheet.getName() + ' is missing the "' + headerName + '" header.');
  }
  return index + 1;
}

/**
 * Append one Clients row, mapping values onto the LIVE header order. Refuses
 * (before any write) when a CLIENTS_HEADERS column is missing — a malformed
 * header row must never produce a silently misaligned client.
 */
function appendClientsRow_(valueByHeader) {
  var sheet = getSheetOrNull_(adminSpreadsheet_(), ADMIN_TABS.CLIENTS);
  if (!sheet) throw new Error("Clients tab missing — run bootstrapTemplates() first.");
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) throw new Error("Clients tab has no header row — run bootstrapTemplates() first.");
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (h) {
    return str_(h);
  });
  CLIENTS_HEADERS.forEach(function (name) {
    if (headers.indexOf(name) === -1) {
      throw new Error('Clients tab is missing the "' + name + '" header — fix row 1 (see CLIENTS_HEADERS).');
    }
  });
  var row = headers.map(function (name) {
    return Object.prototype.hasOwnProperty.call(valueByHeader, name) ? valueByHeader[name] : "";
  });
  sheet.appendRow(row);
}

/**
 * Friendly 2-word gate password + 2 digits (e.g. "goldenmeadow42"): easy to
 * read over the phone and to print on an invitation insert. Plaintext in the
 * admin sheet is accepted by design (HANDOFF addendum §E4) — stakes are
 * guest-level, and menuRotateGateVersion kills all cookies.
 */
function friendlyPassword_() {
  var adjectives = [
    "sunny", "golden", "gentle", "cozy", "merry", "lucky", "rosy", "amber",
    "misty", "velvet", "jolly", "pearl", "dusty", "tender", "breezy", "honey",
  ];
  var nouns = [
    "lake", "meadow", "willow", "garden", "harbor", "poppy", "maple", "dune",
    "clover", "canyon", "orchid", "tulip", "cedar", "brook", "petal", "fern",
  ];
  var pick = function (list) {
    return list[Math.floor(Math.random() * list.length)];
  };
  var digits = String(Math.floor(Math.random() * 90) + 10);
  return pick(adjectives) + pick(nouns) + digits;
}

/**
 * "YYYY-MM-DD" → Date at local midnight in the script timezone, or null.
 * Built by parts, NOT new Date(string) — ISO strings parse as UTC midnight
 * and shift a day in western timezones (the live countdown's §5 bug 9).
 */
function parseIsoDate_(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str_(value));
  if (!match) return null;
  var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isNaN(date.getTime()) ? null : date;
}

function htmlEscape_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

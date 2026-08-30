/**
 * action=health&site=<slug> — the per-tab parse report that REPLACES the
 * legacy public /admin/health page (HANDOFF §5 bug 8: that page was public
 * and leaked script URLs). This one sits behind the platform secret.
 */
function handleHealth_(slug) {
  if (!isValidSlug_(slug)) {
    return { ok: false, error: "unknown_site", version: SCRIPT_VERSION };
  }
  var client = findClient_(slug);
  if (!client) {
    return { ok: false, error: "unknown_site", version: SCRIPT_VERSION };
  }

  var report = {
    ok: true,
    site: slug,
    status_cell: client.status,
    effective_status: effectiveStatus_(client),
    expires_at: client.expires_at ? client.expires_at.toISOString() : null,
    entitlements: {
      rsvp: client.mod_rsvp,
      gallery_premium: client.mod_gallery_premium,
      password_gate: client.mod_password_gate,
      things_to_do: client.mod_things_to_do,
    },
    gate_configured: client.mod_password_gate ? client.gate_password !== "" : null,
    expires_at_invalid: client.expires_at_invalid === true,
    gate_password_version_invalid: client.gate_password_version_invalid === true,
    contact_present: Boolean(client.contact_name || client.contact_phone),
    theme_preset: client.theme_preset,
    tabs: {},
    basics_missing: [],
    warnings: [],
    cache: cacheGet_("cfg:" + slug) ? "hit" : "miss",
    guest_sheet: "not_checked (RSVP ships in its own session)",
    version: SCRIPT_VERSION,
  };

  var themeWarnings = [];
  resolveTheme_(client.theme_preset, themeWarnings);
  report.warnings = report.warnings.concat(themeWarnings);

  if (!client.client_sheet_id) {
    report.client_sheet = "missing client_sheet_id";
    return report;
  }

  var spreadsheet;
  try {
    spreadsheet = SpreadsheetApp.openById(client.client_sheet_id);
    report.client_sheet = "ok";
  } catch (err) {
    report.client_sheet = "unreachable: " + String(err);
    return report;
  }

  Object.keys(TAB_SCHEMAS).forEach(function (tabName) {
    var schema = TAB_SCHEMAS[tabName];
    var warnings = [];
    if (schema.type === "kv") {
      var kv = readKvTab_(spreadsheet, tabName, warnings);
      var missing = [];
      schema.keys.forEach(function (def) {
        if (def.required && !kv[def.key]) missing.push(def.key);
      });
      report.tabs[tabName] = {
        present: warnings.length === 0,
        keys_filled: Object.keys(kv).filter(function (k) {
          return kv[k] !== "";
        }).length,
        missing_required: missing,
      };
      if (tabName === "Basics") report.basics_missing = missing;
    } else {
      var rows = readTableTab_(spreadsheet, tabName, warnings);
      report.tabs[tabName] = {
        present: warnings.filter(function (w) {
            return w.indexOf("missing_tab") === 0;
          }).length === 0,
        rows: rows.length,
        parse_warnings: warnings,
      };
    }
  });

  return report;
}

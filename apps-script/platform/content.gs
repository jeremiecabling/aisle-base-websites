/**
 * CLIENT sheet parsing + config payload assembly.
 *
 * TAB_SCHEMAS is THE parsing convention (HANDOFF Bug 1 fix): two tab shapes
 * only, declared here per tab — NO format sniffing, ever. Locked-KV tabs are
 * key (col A, protected) / value (col B, couple-edits) / help (col C,
 * protected). Table tabs have exact snake_case headers in row 1 (protected),
 * blank rows skipped, unknown columns ignored, cells addressed by header
 * NAME. Everything is read as String(cell).trim().
 *
 * bootstrapTemplates() (bootstrap.gs) builds the template sheets FROM these
 * same declarations, so the parser and the sheets cannot drift.
 */

var TAB_SCHEMAS = {
  Basics: {
    type: "kv",
    keys: [
      { key: "couple_names", required: true, help: "How your names appear everywhere, e.g. “Ana & Ben”" },
      { key: "monogram", help: "Short form for the nav, e.g. “A & B” (defaults to your names)" },
      { key: "wedding_date", required: true, help: "YYYY-MM-DD, e.g. 2027-06-12 — drives the countdown" },
      { key: "wedding_date_display", help: "The date as guests should read it, e.g. “June 12, 2027”" },
      { key: "timezone", help: "IANA timezone of the venue, e.g. America/Los_Angeles (operator fills this)" },
      { key: "hero_tagline", help: "One line under your names on the big photo" },
      { key: "venue_line_1", help: "First venue line on the hero, e.g. the ceremony venue" },
      { key: "venue_line_2", help: "Second venue line, e.g. the reception venue" },
      { key: "hero_image_url", image: true, help: "Paste an image link — Google Drive “Anyone with link” works" },
      { key: "gate_video_url", help: "Operator fills this (video is uploaded for you)" },
      { key: "countdown_caption", help: "Text under the countdown number, e.g. “days until we say I do”" },
      { key: "registry_intro", help: "A sentence above your registry cards (optional)" },
      { key: "footer_note", help: "Small line at the very bottom (optional)" },
    ],
  },
  Schedule: {
    type: "table",
    headers: ["day_label", "time", "title", "tag", "detail", "address", "maps_url", "note"],
    required: ["day_label", "time", "title"],
  },
  Travel: {
    type: "table",
    headers: [
      "hotel_name",
      "description",
      "address",
      "phone",
      "block_name",
      "group_code",
      "booking_url",
      "button_label",
    ],
    required: ["hotel_name"],
  },
  "Things To Do": {
    type: "table",
    headers: ["category", "name", "blurb", "url"],
    required: ["category", "name"],
  },
  FAQ: {
    type: "table",
    headers: ["question", "answer"],
    required: ["question", "answer"],
  },
  Registry: {
    type: "table",
    headers: ["title", "description", "url", "button_label"],
    required: ["title", "url"],
  },
  Story: {
    type: "table",
    headers: ["heading", "paragraph", "image_url"],
    required: ["paragraph"],
  },
  Gallery: {
    type: "table",
    headers: ["image_url", "caption", "alt_text"],
    required: ["image_url"],
  },
  // "RSVP Text" (kv) ships with the RSVP session.
};

var GALLERY_CAP_BASE = 12;
var GALLERY_CAP_PREMIUM = 40;
var GALLERY_LAYOUTS = ["grid", "masonry", "editorial", "filmstrip"];

/**
 * Drive share links → a direct-render image URL (addendum Q14). Accepts the
 * link a couple actually copies (drive.google.com/file/d/<id>/view), the
 * uc?export=view form, and open?id=; emits lh3.googleusercontent.com/d/<id>.
 * Both Drive forms are unofficial — any direct https image URL passes
 * through untouched and is the documented reliable path.
 */
function normalizeImageUrl_(url) {
  var value = String(url || "").trim();
  if (!value) return "";
  var id = null;
  var fileMatch = value.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (fileMatch) id = fileMatch[1];
  var ucMatch = value.match(/drive\.google\.com\/(?:uc|open)\?[^#]*\bid=([\w-]+)/);
  if (ucMatch) id = ucMatch[1];
  if (id) return "https://lh3.googleusercontent.com/d/" + id;
  return value;
}

function isHttps_(url) {
  return /^https:\/\//.test(String(url || "").trim());
}

/** Locked-KV tab → { key: value } map (values as trimmed strings). */
function readKvTab_(spreadsheet, tabName, warnings) {
  var sheet = spreadsheet.getSheetByName(tabName);
  if (!sheet) {
    warnings.push("missing_tab: " + tabName);
    return {};
  }
  var values = sheet.getDataRange().getValues();
  var map = {};
  for (var r = 0; r < values.length; r++) {
    var key = str_(values[r][0]);
    if (!key || key.charAt(0) === "#") continue;
    map[key] = str_(values[r][1]);
  }
  return map;
}

/** Table tab → array of row objects per its TAB_SCHEMAS entry. */
function readTableTab_(spreadsheet, tabName, warnings) {
  var schema = TAB_SCHEMAS[tabName];
  var sheet = spreadsheet.getSheetByName(tabName);
  if (!sheet) {
    warnings.push("missing_tab: " + tabName);
    return [];
  }
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) return [];

  var headers = values[0].map(function (h) {
    return str_(h);
  });
  schema.headers.forEach(function (expected) {
    if (headers.indexOf(expected) === -1) {
      warnings.push("missing_header: " + tabName + "." + expected);
    }
  });

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var raw = values[r];
    var row = {};
    var hasAnyValue = false;
    headers.forEach(function (header, c) {
      if (schema.headers.indexOf(header) === -1) return; // unknown columns ignored
      var value = str_(raw[c]);
      row[header] = value;
      if (value) hasAnyValue = true;
    });
    if (!hasAnyValue) continue; // blank rows skipped

    var missingRequired = (schema.required || []).filter(function (key) {
      return !row[key];
    });
    if (missingRequired.length > 0) {
      warnings.push(
        "skipped_row: " + tabName + " row " + (r + 1) + " missing " + missingRequired.join(",")
      );
      continue;
    }
    rows.push(row);
  }
  return rows;
}

/** Consecutive equal day_labels → one accordion day (HANDOFF §7.3). */
function groupScheduleDays_(rows) {
  var days = [];
  var current = null;
  rows.forEach(function (row) {
    if (!current || current.label !== row.day_label) {
      current = { label: row.day_label, events: [] };
      days.push(current);
    }
    current.events.push({
      time: row.time,
      title: row.title,
      tag: row.tag,
      detail: row.detail,
      address: row.address,
      maps_url: isHttps_(row.maps_url) ? row.maps_url : "",
      note: row.note,
    });
  });
  return days;
}

/**
 * Full config payload for one client (HANDOFF §7.4 action=config):
 * entitlement-filtered — keys of disabled modules are OMITTED entirely.
 * Content problems become warnings + best-effort payload (the Next side's
 * schema decides whether it is servable and falls back to last-known-good);
 * only secret_mismatch/unknown_site are authoritative ok:false refusals.
 */
function assembleConfigPayload_(client) {
  var warnings = [];
  var status = effectiveStatus_(client);
  if (status === "expired" && client.status === "active") {
    logEvent_(client.slug, "expired_served", "expires_at passed; downgraded at read time");
  }

  var entitlements = {
    rsvp: client.mod_rsvp,
    gallery_premium: client.mod_gallery_premium,
    password_gate: client.mod_password_gate,
    things_to_do: client.mod_things_to_do,
  };

  var theme = resolveTheme_(client.theme_preset, warnings);

  var clientSheet = null;
  if (!client.client_sheet_id) {
    warnings.push("no client_sheet_id in Clients row");
  } else {
    try {
      clientSheet = SpreadsheetApp.openById(client.client_sheet_id);
    } catch (err) {
      warnings.push("client_sheet_error: " + String(err));
      logEvent_(client.slug, "client_sheet_error", String(err));
    }
  }

  var content = clientSheet
    ? readClientContent_(clientSheet, entitlements, client, warnings)
    : emptyContent_(warnings);

  content.chrome = readDefaultsMap_();

  var payload = {
    ok: true,
    site: client.slug,
    status: status,
    entitlements: entitlements,
    contact: { name: client.contact_name, phone: client.contact_phone },
    theme: theme,
    content: content,
    warnings: warnings,
    version: SCRIPT_VERSION,
  };

  if (client.mod_password_gate) {
    if (!client.gate_password) warnings.push("password gate entitled but gate_password is empty");
    payload.gate = {
      enabled: client.gate_password !== "",
      password: client.gate_password,
      password_version: client.gate_password_version,
    };
  }

  if (!client.contact_name && !client.contact_phone) {
    warnings.push("contact_name/contact_phone empty (guest-facing banners will omit contact)");
  }

  return payload;
}

function readClientContent_(spreadsheet, entitlements, client, warnings) {
  var kv = readKvTab_(spreadsheet, "Basics", warnings);

  var basics = {
    couple_names: kv.couple_names || "",
    monogram: kv.monogram || "",
    wedding_date: kv.wedding_date || "",
    wedding_date_display: kv.wedding_date_display || kv.wedding_date || "",
    timezone: kv.timezone || Session.getScriptTimeZone(),
    hero_tagline: kv.hero_tagline || "",
    venue_line_1: kv.venue_line_1 || "",
    venue_line_2: kv.venue_line_2 || "",
    hero_image_url: normalizeImageUrl_(kv.hero_image_url),
    gate_video_url: kv.gate_video_url || "",
    countdown_caption: kv.countdown_caption || "",
    registry_intro: kv.registry_intro || "",
    footer_note: kv.footer_note || "",
  };
  if (!basics.couple_names) warnings.push("Basics.couple_names is empty (required)");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(basics.wedding_date)) {
    warnings.push("Basics.wedding_date is not YYYY-MM-DD: \"" + basics.wedding_date + "\"");
  }
  if (!kv.timezone) warnings.push("Basics.timezone empty — using script timezone " + basics.timezone);

  var content = {
    basics: basics,
    schedule: groupScheduleDays_(readTableTab_(spreadsheet, "Schedule", warnings)),
    travel: readTableTab_(spreadsheet, "Travel", warnings).map(function (row) {
      return {
        hotel_name: row.hotel_name,
        description: row.description,
        address: row.address,
        phone: row.phone,
        block_name: row.block_name,
        group_code: row.group_code,
        booking_url: isHttps_(row.booking_url) ? row.booking_url : "",
        button_label: row.button_label,
      };
    }),
    faq: readTableTab_(spreadsheet, "FAQ", warnings),
    registry: readTableTab_(spreadsheet, "Registry", warnings)
      .filter(function (row) {
        if (!isHttps_(row.url)) {
          warnings.push("Registry row \"" + row.title + "\" dropped: url is not https");
          return false;
        }
        return true;
      })
      .map(function (row) {
        return {
          title: row.title,
          description: row.description,
          url: row.url,
          button_label: row.button_label,
        };
      }),
    story: readTableTab_(spreadsheet, "Story", warnings).map(function (row) {
      return {
        heading: row.heading,
        paragraph: row.paragraph,
        image_url: normalizeImageUrl_(row.image_url),
      };
    }),
    chrome: {},
  };

  // Parsed only when entitled (§7.3) — key omitted entirely otherwise.
  if (entitlements.things_to_do) {
    content.things_to_do = readTableTab_(spreadsheet, "Things To Do", warnings);
  }

  var galleryRows = readTableTab_(spreadsheet, "Gallery", warnings).map(function (row) {
    return {
      image_url: normalizeImageUrl_(row.image_url),
      caption: row.caption,
      alt_text: row.alt_text,
    };
  });
  if (galleryRows.length > 0) {
    var cap = entitlements.gallery_premium ? GALLERY_CAP_PREMIUM : GALLERY_CAP_BASE;
    if (galleryRows.length > cap) {
      warnings.push("Gallery truncated from " + galleryRows.length + " to " + cap + " images");
      galleryRows = galleryRows.slice(0, cap);
    }
    var layout = client.gallery_layout || "grid";
    if (GALLERY_LAYOUTS.indexOf(layout) === -1) {
      warnings.push('unknown gallery_layout "' + layout + '" — using grid');
      layout = "grid";
    }
    if (!entitlements.gallery_premium && layout !== "grid") {
      layout = "grid"; // premium layouts are an entitlement (§7.2 col P)
    }
    content.gallery = { layout: layout, images: galleryRows };
  }

  return content;
}

function emptyContent_(warnings) {
  warnings.push("serving empty content (client sheet unreachable)");
  return {
    basics: {
      couple_names: "",
      wedding_date: "",
      wedding_date_display: "",
      timezone: Session.getScriptTimeZone(),
    },
    schedule: [],
    travel: [],
    faq: [],
    registry: [],
    story: [],
    chrome: {},
  };
}

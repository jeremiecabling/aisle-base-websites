/**
 * Aisle Base platform script — bound to the ADMIN spreadsheet.
 *
 * ONE web-app deployment (Execute as Me / access: Anyone). Ship changes via
 * Manage deployments → Edit → New version. NEVER create a second deployment:
 * that changes the /exec URL and strands the platform (HANDOFF §7.4).
 *
 * Script Properties required:
 *   PLATFORM_SECRET — must equal Vercel's PLATFORM_API_SECRET
 *   TOKEN_SECRET    — reserved for the RSVP session (party tokens)
 *
 * GAS web apps CANNOT set HTTP status codes: every response is HTTP 200 and
 * consumers MUST branch on body.ok (HANDOFF §2 gotcha — the Next side does).
 */

var SCRIPT_VERSION = "v2.0.0-milestone1";

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = String(params.action || "");

  try {
    if (!checkSecret_(params)) {
      logEvent_(String(params.site || ""), "secret_mismatch", "action=" + action);
      return jsonResponse_({ ok: false, error: "secret_mismatch", version: SCRIPT_VERSION });
    }

    switch (action) {
      case "config":
        return jsonResponse_(handleConfig_(String(params.site || "")));
      case "domains":
        return jsonResponse_(handleDomains_());
      case "health":
        return jsonResponse_(handleHealth_(String(params.site || "")));
      case "flush":
        return jsonResponse_(handleFlush_(String(params.site || "")));
      default:
        return jsonResponse_({ ok: false, error: "unknown_action", version: SCRIPT_VERSION });
    }
  } catch (err) {
    // Never let an exception produce a non-JSON body — the platform parses
    // every response.
    logEvent_(String(params.site || ""), "script_error", String(err && err.stack ? err.stack : err));
    return jsonResponse_({ ok: false, error: "script_error", detail: String(err), version: SCRIPT_VERSION });
  }
}

/**
 * RSVP lands in its own follow-up session (addendum Q6) with the frozen
 * contracts from HANDOFF §3. Until then doPost refuses loudly instead of
 * half-working.
 */
function doPost() {
  return jsonResponse_({
    ok: false,
    error: "rsvp_not_implemented",
    detail: "RSVP ships in the dedicated RSVP session. See docs/HANDOFF.md sections 3 and 7.4.",
    version: SCRIPT_VERSION,
  });
}

function checkSecret_(params) {
  var expected = PropertiesService.getScriptProperties().getProperty("PLATFORM_SECRET");
  if (!expected) {
    // Fail closed: an undeployed/misconfigured script must not serve configs.
    return false;
  }
  return String(params.secret || "") === expected;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function handleConfig_(slug) {
  if (!isValidSlug_(slug)) {
    return { ok: false, error: "unknown_site", version: SCRIPT_VERSION };
  }

  var cached = cacheGet_("cfg:" + slug);
  if (cached) return cached;

  var client = findClient_(slug);
  if (!client) {
    return { ok: false, error: "unknown_site", version: SCRIPT_VERSION };
  }

  var payload = assembleConfigPayload_(client);
  logEvent_(slug, "config_served_uncached", "status=" + payload.status);
  cachePut_("cfg:" + slug, payload, configCacheSeconds_());
  return payload;
}

function handleDomains_() {
  var cached = cacheGet_("domains");
  if (cached) return cached;

  var clients = readClients_();
  var domains = {};
  var slugs = [];
  clients.forEach(function (client) {
    // The domains map includes EVERY status: middleware only resolves
    // host→slug; the tenant layout is what enforces status. Dropping a
    // paused/expired tenant here would show its guests the apex landing
    // instead of the status screen (and make staging previews on custom
    // domains impossible).
    if (client.custom_domain) {
      domains[client.custom_domain.toLowerCase()] = client.slug;
    }
    if (effectiveStatus_(client) === "active") {
      slugs.push(client.slug);
    }
  });

  var payload = { ok: true, domains: domains, slugs: slugs, version: SCRIPT_VERSION };
  cachePut_("domains", payload, configCacheSeconds_());
  return payload;
}

function handleFlush_(slug) {
  if (slug && isValidSlug_(slug)) {
    flushClientCache_(slug);
    return { ok: true, flushed: ["cfg:" + slug, "domains"], version: SCRIPT_VERSION };
  }
  var flushed = flushAllCache_();
  return { ok: true, flushed: flushed, version: SCRIPT_VERSION };
}

function isValidSlug_(slug) {
  return /^[a-z0-9-]{1,63}$/.test(slug);
}

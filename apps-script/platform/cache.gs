/**
 * CacheService layer (HANDOFF §7.4): cfg:<slug> and domains, default 60s
 * (Ops.default_cache_seconds overrides, clamped to CacheService's 21600s
 * max). Values >95 KB skip the cache with a log entry — CacheService caps
 * entries at 100 KB and a premium gallery payload can approach it (§8 item 3
 * drives the gallery cap).
 */

var CACHE_MAX_BYTES = 95 * 1024;

function scriptCache_() {
  return CacheService.getScriptCache();
}

function configCacheSeconds_() {
  var raw = Number(readOps_("default_cache_seconds"));
  if (!isFinite(raw) || raw <= 0) return 60;
  return Math.min(Math.floor(raw), 21600);
}

function cacheGet_(key) {
  try {
    var cached = scriptCache_().get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    return null;
  }
}

function cachePut_(key, payload, seconds) {
  try {
    var json = JSON.stringify(payload);
    if (Utilities.newBlob(json).getBytes().length > CACHE_MAX_BYTES) {
      logEvent_(key, "cache_skip_large", json.length + " chars");
      return;
    }
    scriptCache_().put(key, json, seconds);
  } catch (err) {
    logEvent_(key, "cache_error", String(err));
  }
}

function flushClientCache_(slug) {
  scriptCache_().removeAll(["cfg:" + slug, "domains"]);
  logEvent_(slug, "cache_flush", "cfg:" + slug + " + domains");
}

function flushAllCache_() {
  var keys = readClients_().map(function (client) {
    return "cfg:" + client.slug;
  });
  keys.push("domains");
  scriptCache_().removeAll(keys);
  logEvent_("", "cache_flush", "all (" + keys.length + " keys)");
  return keys;
}

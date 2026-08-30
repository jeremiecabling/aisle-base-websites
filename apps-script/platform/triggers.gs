/**
 * Installable onEdit trigger (HANDOFF §7.2): edits to admin data flush the
 * relevant cache keys so entitlement/theme changes go live in ≤ the ISR
 * window (~2-3 min) instead of waiting out the GAS cache too.
 *
 * INSTALLABLE, not simple: simple onEdit triggers cannot call services that
 * require authorization. Installed by Wedding Hub → "Install onEdit trigger"
 * (menu.gs) or manually: Triggers → Add → handleAdminEdit → From spreadsheet
 * → On edit.
 */
function handleAdminEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheetName = e.range.getSheet().getName();

    if (sheetName === ADMIN_TABS.CLIENTS) {
      var sheet = e.range.getSheet();
      var firstRow = e.range.getRow();
      var lastRow = e.range.getLastRow();
      if (firstRow === 1 && lastRow === 1) return; // header-only edits don't affect payloads

      // Slug column by header NAME (headerColumn_, menu.gs) — column A is not
      // guaranteed to be slug if the operator reordered columns, and flushing
      // the wrong key would leave real edits stale. Any doubt → flush wide;
      // a too-broad flush costs one uncached rebuild, a too-narrow one costs
      // hours of stale config.
      var slugColumn;
      try {
        slugColumn = headerColumn_(sheet, "slug");
      } catch (err) {
        flushAllCache_();
        return;
      }

      // A paste/fill can span rows — flush every edited row's slug.
      var flushWide = false;
      for (var row = Math.max(firstRow, 2); row <= lastRow; row++) {
        var slug = str_(sheet.getRange(row, slugColumn).getValue()).toLowerCase();
        if (slug && isValidSlug_(slug)) {
          flushClientCache_(slug);
        } else {
          flushWide = true; // slug cell blank/invalid — may itself have been edited
        }
      }
      if (flushWide) flushAllCache_();
      return;
    }

    if (
      sheetName === ADMIN_TABS.THEMES ||
      sheetName === ADMIN_TABS.DEFAULTS ||
      sheetName === ADMIN_TABS.OPS
    ) {
      flushAllCache_(); // these tabs feed every tenant's payload
    }
  } catch (err) {
    logEvent_("", "script_error", "handleAdminEdit: " + String(err));
  }
}

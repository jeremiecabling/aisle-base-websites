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
      var row = e.range.getRow();
      if (row === 1) return; // header edits don't affect payloads
      var slug = str_(e.range.getSheet().getRange(row, 1).getValue()).toLowerCase();
      if (slug && isValidSlug_(slug)) {
        flushClientCache_(slug);
      } else {
        flushAllCache_(); // slug itself may have been edited — flush wide
      }
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

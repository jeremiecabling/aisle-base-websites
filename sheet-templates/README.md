# Sheet templates

The ADMIN, CLIENT, and GUEST sheet templates are **not hand-built** — they are
generated programmatically by `bootstrapTemplates()` in
`apps-script/platform/bootstrap.gs` (addendum Q2). That function is the
single source of truth for tab names, headers, validations, protections, and
help text; the CLIENT tabs are built from the same `TAB_SCHEMAS` constant the
parser reads, so the sheets and the parser cannot drift (the Bug 1 class is
structurally dead).

## What lives here

- `*.xlsx` exports of the generated templates — **committed after the
  operator first runs `bootstrapTemplates()`** (File → Download → .xlsx on
  each template), purely as a browsable reference for humans. The exports are
  documentation, not the source: regenerating from `bootstrapTemplates()`
  always wins.

## Regenerating

1. Follow `docs/RUNBOOK-GOOGLE.md` through the `bootstrapTemplates()` step.
2. The function fills `Ops.template_client_sheet_id` / `template_guest_sheet_id`
   in the ADMIN sheet with the new template IDs.
3. Export each template as .xlsx into this directory and commit.

Legacy reference: `Test_Custom_Wedding_Website.xlsx` (v1's 13-tab content
sheet) is deliberately NOT carried over — its format is the one Bug 1 choked
on (HANDOFF §5).

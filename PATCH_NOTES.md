# InkForge V2 repair patch

This package contains the source files repaired from the current `main` branch.

## Added in V2
- Fixed `components/Nav.js`: uses the actual `t('...')` translation API instead of obsolete object properties.
- Fixed `app/[lang]/page.js`: corrected broken relative imports from `../../lib` to `../../../lib` and passed RTL direction through `LocaleShell`.
- Retains the previous V1 fixes: shared locale layout, responsive home header, StencilTool validation/drag-drop, stencil pipeline fixes, safer health endpoint, Supabase helper hardening, marketplace route params, and the missing CommonJS pipeline adapter.

## Apply
Extract this ZIP into the repository root and replace the matching files. Upload the extracted files to GitHub; do not upload the ZIP itself.

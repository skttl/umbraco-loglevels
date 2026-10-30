# LogLevels implementation plan

**Goal:** Deliver Umbraco.Community.LogLevels 17.0.0 with runtime log-level control inside Log Viewer.

**Architecture:** Follow the sibling Unlog package: src, tests, docs, icon, Marketplace metadata and GitHub workflows. A process-local runtime policy starts from Serilog configuration and supports atomic updates without replacing cached contextual loggers. An administrator-only API serves a native Lit/UUI workspace view.

**Constraints:** Umbraco references start at 17.0.0 and exclude 18.0.0; client reference exactly 17.0.0. Do not modify appsettings, publish externally, or implement Umbraco18 in this phase. Use the approved Overblik table, under Settings > Log Viewer > Log levels, icon-equalizer.

## Tasks

- [x] Backend: read exact Umbraco17 startup APIs; implement runtime source matching, validation, atomic revisions, reset and admin API. Preserve configured sinks/enrichers.
- [x] Tests: prove Warning/Information -> Information/Debug with cached loggers, adding/removing sources, longest prefix with dot boundary, reset, validation and conflicting revisions.
- [x] UI: native table of active and draft levels, add/remove namespace, apply/reset, loading/errors/409; authenticated API requests and server-side admin authorization.
- [x] Packaging: Razor static assets, 17.0.0 metadata, NuGet readme, repository guide, Marketplace guide, CI and trusted-publishing workflow following Unlog.
- [x] Verification: frontend build, backend tests, project-reference and installed-NuGet browser checks, NuGet archive inspection and independent review; no high/medium findings remain.

## UI and data flow

Log Viewer workspace -> workspaceView Log levels -> uui-box and accessible table -> authenticated GET/PUT/DELETE -> runtime policy. Rows show Source | Active | New level | Remove. Default row cannot be removed. Add namespace creates a draft only. Apply atomically replaces effective rules. Reset restores startup settings. Changes apply to this process only and vanish on restart.

## Review focus

Cached logger instances must respond to new prefixes; xyz must not match xyzOther; removing a child inherits its parent; invalid/stale requests must not partially update policy; root/sink prefilters must not silently invalidate UI promises.

## Automatic installation follow-up

Use IComposer to configure standard Umbraco startup without a Program.cs call. Preserve bootstrap thresholds until Umbraco constructs its runtime logger; retain the optional early extension for custom startup. Verify cached loggers, idempotence, unsupported startup and installed-package behavior.

## Localization follow-up

Localize all package backoffice text through the Umbraco17 localization registry, with English fallback and de/fr/nl/da/sv/it/es included. Preserve canonical API level values; resolve notices and validation at render time so culture changes update existing messages. Verify catalog/placeholder parity, build and live backoffice language selection.

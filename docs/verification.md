# Umbraco 18 verification

Verified on 2026-10-30 with .NET SDK 10.0.401 and Node.js 24.19.0.

- `main` targets package version 18.0.0 and Umbraco `[18.0.0,19.0.0)`. The frozen 17 version is on `v17/main`.
- A clean Release build of the entire solution succeeds, including the Umbraco 18.0.2 / Clean 8.0.1 test site.
- All 59 backend tests and 7 client tests pass.
- TypeScript compilation, Vite production build and client regeneration with OpenAPI TS 0.97.0 succeed. This generator version satisfies the Umbraco 18 client peer dependency.
- The NuGet package contains the expected identity/version, 18-only dependency range, readme, icon, notices and static browser assets.
- Both workflows pass actionlint 1.7.7, verified against the official release checksums. The 18 workflows use Node.js 24 and build the entire solution before running tests.
- A fresh SQLite unattended install succeeds, including Clean migrations and published sample content. HTTP checks confirm the Clean homepage and backoffice return 200, the plugin manifest reports 18.0.0, and unauthenticated access to the settings API returns 401.

The 18 development profile uses `Umbraco18.sqlite.db`, preserving the 17 database. When changing Umbraco majors in the same checkout, remove generated `bin`/`obj` folders and ignored Clean views before a fresh install. Stale assemblies and views from the previous major can otherwise prevent startup or Razor compilation.

The screenshot and earlier browser interactions were recorded on Umbraco 17. See [the historical verification](verification-v17.md). The Umbraco 18 tab has not been tested interactively in a browser.

NuGet and npm report dependency vulnerability advisories. No dependency changes unrelated to Umbraco 18 compatibility were made. No production-load benchmark, NuGet publication or release tag was performed. Publishing requires the GitHub `release` environment, its `NUGET_USER` secret and a matching NuGet trusted-publishing policy.

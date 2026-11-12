# Umbraco 19 RC verification

Verified on 2026-11-12 with .NET SDK 11.0.100, Node.js 24.22.3 and npm 11.19.1 on Windows.

- `main` targets LogLevels `19.0.0-beta01` and Umbraco `[19.0.0-rc1,20.0.0)`. Umbraco 18 is maintained on `v18/main`, and Umbraco 17 on `v17/main`.
- The entire solution builds in Release with zero warnings and zero errors, including the Umbraco `19.0.0-rc1` / Clean `19.0.0-beta01` test site. All three projects target `net11.0`.
- All 59 backend tests pass, with zero failures and zero skipped tests.
- A clean `npm ci --ignore-scripts`, API client regeneration with OpenAPI TS `0.99.0`, all 7 client tests, TypeScript compilation and Vite production build succeed. This generator satisfies the v19 backoffice peer dependency.
- An assertion-based request check against the regenerated SDK verifies GET, PUT and DELETE use `credentials: 'include'`, omit the Authorization header and target the configured server URL. PUT preserves the policy body and DELETE preserves the revision query parameter.
- The NuGet archive contains version `19.0.0-rc1`, its .NET 11 assembly, the v19-only dependency range, readme, icon, notices and rebuilt browser assets. Its manifest reports the RC version and its element bundle contains the cookie configuration.
- Both workflows pass actionlint `1.7.7`, downloaded with checksum verification. CI and publishing use .NET 11, and publishing accepts v19 tags, including prereleases.
- The `v18/main` workflow adjustment also passes actionlint. It retains .NET 10 and v18 publishing, validating tag ancestry against `origin/v18/main`.

## Upgrade decisions

The [Umbraco 19 RC announcement](https://umbraco.com/blog/umbraco-19-release-candidate/) and [breaking changes](https://docs.umbraco.com/umbraco-cms/19.latest/get-started/upgrading-and-migrating/version-specific) were reviewed. The Umbraco skill server currently supports only majors 17 and 18, so v19 behavior was checked against official documentation and the published RC packages.

The backoffice client now obtains its base URL from `UMB_SERVER_CONTEXT` and uses the browser's authentication cookie, as documented in [Fetch API authentication](https://docs.umbraco.com/umbraco-cms/19.latest/extend-your-project/backoffice-extensions/foundation/fetching-data/fetch-api). It no longer reads token configuration. No custom search, property-editor value conversion, OpenAPI transformers or affected Delivery API operation IDs are used by LogLevels. No runtime-async opt-in is required for the package.

The test site's removed `AllowEditInvariantFromNonDefault` setting was deleted. `Hosting:Debug` remains valid and is retained. The development database filename is now `Umbraco19.sqlite.db`, preserving the existing v17 and v18 database files. No database connection or migration was performed.

## Limits

The site was not started and no browser login or real authenticated cookie request was tested. Repository rules prohibit database connections, so the build and mocked request checks do not establish runtime installation or browser compatibility. Clean is a v19 beta dependency used only by the development test site.

npm reports 7 dependency advisories, including one critical DOMPurify advisory and high advisories in generator dependencies. These npm dependencies are development dependencies; Umbraco browser modules are externalized rather than bundled into LogLevels. No unrelated dependency upgrades were made. No release tag or NuGet publication was performed.

The verification-only .NET 11 and Node.js 24 installations are under ignored `artifacts/`; the system installations were not changed. For normal development install the .NET 11 SDK and Node.js 24.13 or later with npm 11 or later.

See [Umbraco 18 verification](verification-v18.md) and [Umbraco 17 verification](verification-v17.md) for historical checks. The screenshots were recorded on Umbraco 17.

## Beta01 release preparation

The user confirmed the test site works in the browser on 2026-11-12. The site was then stopped. Package metadata and UI branding use 19.0.0-beta01; Umbraco dependencies remain on 19.0.0-rc1. The locally generated imaging signing key was removed from the working diff before committing.

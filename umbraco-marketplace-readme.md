# LogLevels

Adjust logging from the Umbraco backoffice while the site is running.

LogLevels adds a **Log levels** tab inside **Settings > Log Viewer**. Administrators can change the default level, change existing namespace overrides, add new overrides and remove overrides. Apply the changes together or restore the startup settings.

For example, enable `Debug` for your application's services while keeping Microsoft logging at `Warning`. When finished, reset to the levels captured from appsettings at startup.

The interface follows your backoffice language. English, German, French, Dutch, Danish, Swedish, Italian and Spanish are included, with English as the fallback.

## Installation

Install **Umbraco.Community.LogLevels 17.0.0**; the package registers itself automatically through an `IComposer`. Standard Umbraco startup needs no `Program.cs` changes. See [the setup guide](docs/nuget-readme.md) for the complete example. Installation requires one restart; applying log-level changes afterwards does not.

## Scope

- Supports Umbraco 17 and requires an administrator account.
- Runtime changes apply to the current server process only and disappear on restart.
- Configuration files are never rewritten.
- Existing sink restrictions and other Serilog filters still apply.
- Detailed messages may be constructed before filtering, adding CPU overhead. Review this before using on high-volume sites.

The Umbraco 18 version will follow separately.

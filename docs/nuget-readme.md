# LogLevels

Change Serilog log levels and namespace overrides at runtime from the Umbraco Log Viewer.

## Installation

Requires Umbraco 17 and .NET 10. Install the package:

```sh
dotnet add package Umbraco.Community.LogLevels --version 17.0.0
```

The package registers itself through `LogLevelsComposer`. Standard Umbraco startup already calls `.AddComposers()`, so no changes to `Program.cs` are needed. Restart once after installation. Subsequent changes from backoffice take effect without a restart.

Custom startup must run composers before the bootstrap logger is frozen or replaced. The optional `builder.AddLogLevels()` extension remains available for custom logging startup; call it before `CreateUmbracoBuilder()`.

## Use

Sign in as an administrator and open **Settings > Log Viewer > Log levels**. The table shows the active default and namespace overrides alongside the draft levels. Add namespaces or remove overrides, then choose **Apply changes**. **Discard draft** cancels unapplied edits. **Reset to startup** restores the configuration captured when the process started.

Example: a site starting with default `Warning` and `xyz=Information` can change to default `Information` and `xyz=Debug`. Existing logger instances use the new rules for subsequent events. Earlier suppressed events cannot be recovered.

The most specific namespace wins. `xyz` matches `xyz` and `xyz.Services`, but not `xyzOther`. Matching is case-insensitive. Removing a namespace override makes that namespace follow its nearest parent override or the default. Removing an override read from appsettings temporarily deactivates it; resetting restores it.

Up to 256 overrides are supported. Namespace prefixes may contain up to 256 characters and must not contain whitespace, control characters or empty dot-separated segments.

## Languages

The interface follows the current user's backoffice language. English, German, French, Dutch, Danish, Swedish, Italian and Spanish are included. English is the fallback for other languages.

All package UI text uses Umbraco localization keys in the `logLevels` area, including notifications, validation, accessibility labels and displayed log levels. API level values remain the standard Serilog names. To add a language or override wording, register an Umbraco `localization` extension with a default-export dictionary shaped like `{ logLevels: { title: "..." } }`. See `Client/src/localization/en.mjs` in the source for the full set of keys and placeholders.

## Configuration and scope

Your existing `Serilog:MinimumLevel` settings are the startup baseline. Both scalar/default values and declared `LevelSwitches` are supported. No LogLevels-specific appsettings section is required.

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Warning",
      "Override": {
        "Microsoft": "Warning",
        "xyz": "Information"
      }
    }
  }
}
```

Changes are process-local, disappear on restart and never write to appsettings. In a load-balanced setup each server has its own rules; the tab identifies the responding server. The revision check rejects an update if another administrator changed that server's rules after you loaded them.

Edits to the appsettings minimum levels while the process is running do not change the captured startup baseline. Restart to load a new baseline. Later custom Serilog configuration must not reinstate restrictive native minimum levels.

## Logging behavior

To support new namespace overrides for loggers already in use, LogLevels accepts all native Serilog levels and applies a shared filter to each event. An in-memory configuration provider selects an internal permissive level switch for the runtime logger. The original default value remains in configuration, while override values reference that switch. Use the tab/API to read the actual effective rules.

This has a cost: `ILogger.IsEnabled(Debug)` may return true even when LogLevels subsequently filters the event. Message construction and enrichers can run for discarded events. Measure this cost for busy sites before deployment.

Configured sinks, enrichers and additional filters are retained. Sink-specific minimum levels and other filters can still suppress events after LogLevels permits them. A sink set to `Warning` will not write `Debug` merely because the namespace changes to `Debug`. Separately configured sub-loggers and external processes are outside the package's policy.

The standard Log Viewer Overview card reports the effective default level. Custom Log Viewer repositories are preserved and remain responsible for their own level indicator.

`Debug` and `Verbose` can produce large volumes and sensitive diagnostic details. All API operations require an authenticated Umbraco administrator.

## Versions

Package major versions follow Umbraco majors. `17.0.0` targets Umbraco `[17.0.0,18.0.0)`. The Umbraco 18 package is a separate follow-up, not part of this release.

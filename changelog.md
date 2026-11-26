# Changelog

## 17.0.1 (2026-11-26)

### Fixed

Fixed an Umbraco startup crash when an entry under `Serilog:MinimumLevel:Override` is null, empty, or has children but no level of its own. LogLevels now skips these entries just as Serilog does and preserves the configured default level and valid overrides.

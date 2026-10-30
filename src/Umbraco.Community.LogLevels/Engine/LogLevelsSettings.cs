namespace Umbraco.Community.LogLevels.Engine;

/// <summary>A minimum level for a SourceContext namespace prefix.</summary>
public sealed record LogLevelOverride(string Source, string Level);

/// <summary>The complete process-local minimum level rules.</summary>
public sealed record LogLevelSettings(string DefaultLevel, IReadOnlyList<LogLevelOverride> Overrides);

/// <summary>The current rules and immutable startup baseline.</summary>
public sealed record LogLevelsState(LogLevelSettings Current, LogLevelSettings Startup, long Revision, string ServerName);

/// <summary>A replacement rule set and the revision it was edited from.</summary>
public sealed record LogLevelsUpdate(string DefaultLevel, IReadOnlyList<LogLevelOverride> Overrides, long Revision);

public sealed class LogLevelsConflictException() : Exception("The log levels changed since they were loaded. Reload and try again.");

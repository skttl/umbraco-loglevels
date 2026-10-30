using Microsoft.Extensions.Configuration;
using Serilog.Core;
using Serilog.Events;

namespace Umbraco.Community.LogLevels.Engine;

public sealed class LogLevelsStore : ILogEventFilter
{
    private sealed record Rule(string Source, LogEventLevel Level);
    private sealed record Snapshot(LogLevelSettings Settings, LogEventLevel Default, Rule[] Rules, long Revision);

    private readonly object _gate = new();
    private readonly Snapshot _startup;
    private Snapshot _current;

    public LogLevelsStore(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        var section = configuration.GetSection("Serilog:MinimumLevel");
        var defaultLevel = section["ControlledBy"] ?? GetDefaultLevel(configuration, section) ?? "Information";
        var overrides = section.GetSection("Override").GetChildren()
            .Select(child => new LogLevelOverride(child.Key, ResolveLevel(configuration, child.Value))).ToArray();
        _startup = CreateSnapshot(ResolveLevel(configuration, defaultLevel), overrides, 0);
        _current = _startup;
    }

    public LogLevelsState GetSettings() => State(Volatile.Read(ref _current));

    public LogLevelsState Apply(LogLevelsUpdate update)
    {
        ArgumentNullException.ThrowIfNull(update);
        if (update.Revision < 0 || update.Revision == long.MaxValue)
            throw new ArgumentException("Supply a valid non-negative revision.");
        var next = CreateSnapshot(update.DefaultLevel, update.Overrides, update.Revision + 1);
        lock (_gate)
        {
            if (_current.Revision != update.Revision)
                throw new LogLevelsConflictException();
            Volatile.Write(ref _current, next);
            return State(next);
        }
    }

    public LogLevelsState Reset(long revision)
    {
        lock (_gate)
        {
            if (_current.Revision != revision)
                throw new LogLevelsConflictException();
            var next = _startup with { Revision = revision + 1 };
            Volatile.Write(ref _current, next);
            return State(next);
        }
    }

    public bool IsEnabled(LogEvent logEvent)
    {
        var snapshot = Volatile.Read(ref _current);
        if (logEvent.Properties.TryGetValue("SourceContext", out var value) && value is ScalarValue { Value: string source })
        {
            foreach (var rule in snapshot.Rules)
            {
                if (source.Equals(rule.Source, StringComparison.OrdinalIgnoreCase) ||
                    (source.Length > rule.Source.Length && source[rule.Source.Length] == '.' && source.StartsWith(rule.Source, StringComparison.OrdinalIgnoreCase)))
                    return logEvent.Level >= rule.Level;
            }
        }
        return logEvent.Level >= snapshot.Default;
    }

    private LogLevelsState State(Snapshot snapshot) =>
        new(snapshot.Settings, _startup.Settings, snapshot.Revision, Environment.MachineName);

    private static Snapshot CreateSnapshot(string defaultLevel, IReadOnlyList<LogLevelOverride> overrides, long revision)
    {
        var level = ParseLevel(defaultLevel);
        if (overrides is null || overrides.Count > 256)
            throw new ArgumentException("Supply no more than 256 namespace overrides.");
        var sources = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var rules = new List<Rule>(overrides.Count);
        foreach (var item in overrides)
        {
            if (item is null || string.IsNullOrWhiteSpace(item.Source) || item.Source.Length > 256 ||
                item.Source.Any(char.IsWhiteSpace) || item.Source.Any(char.IsControl) ||
                item.Source.StartsWith('.') || item.Source.EndsWith('.') || item.Source.Contains("..", StringComparison.Ordinal))
                throw new ArgumentException("Namespace prefixes must be 1–256 characters without whitespace or empty dot-separated segments.");
            if (!sources.Add(item.Source))
                throw new ArgumentException($"Duplicate namespace override: {item.Source}.");
            rules.Add(new Rule(item.Source, ParseLevel(item.Level)));
        }
        var ordered = rules.OrderByDescending(rule => rule.Source.Length).ThenBy(rule => rule.Source, StringComparer.Ordinal).ToArray();
        var settings = new LogLevelSettings(level.ToString(), Array.AsReadOnly(ordered
            .OrderBy(rule => rule.Source, StringComparer.Ordinal)
            .Select(rule => new LogLevelOverride(rule.Source, rule.Level.ToString())).ToArray()));
        return new Snapshot(settings, level, ordered, revision);
    }

    private static LogEventLevel ParseLevel(string? level)
    {
        if (level is null || !Enum.GetNames<LogEventLevel>().Contains(level, StringComparer.OrdinalIgnoreCase) ||
            !Enum.TryParse<LogEventLevel>(level, true, out var parsed))
            throw new ArgumentException("Log level must be Verbose, Debug, Information, Warning, Error or Fatal.");
        return parsed;
    }

    private static string ResolveLevel(IConfiguration configuration, string? value)
    {
        if (value is not null && value.StartsWith('$'))
            return configuration[$"Serilog:LevelSwitches:{value}"] ?? configuration[$"Serilog:LevelSwitches:{value[1..]}"] ??
                throw new ArgumentException($"The Serilog level switch {value} is not configured.");
        return value ?? throw new ArgumentException("A Serilog minimum level is missing.");
    }

    private static string? GetDefaultLevel(IConfiguration configuration, IConfigurationSection section)
    {
        var defaultSection = section.GetSection("Default");
        if (configuration is IConfigurationRoot root && section.Value is not null && defaultSection.Value is not null)
        {
            // Match Serilog's provider precedence when scalar and object configuration shapes coexist.
            foreach (var provider in root.Providers.Reverse())
            {
                if (provider.TryGet(section.Path, out var scalar) && !string.IsNullOrEmpty(scalar))
                    return section.Value;
                if (provider.TryGet(defaultSection.Path, out var nested) && !string.IsNullOrEmpty(nested))
                    return defaultSection.Value;
            }
            return null;
        }
        return section.Value ?? defaultSection.Value;
    }
}

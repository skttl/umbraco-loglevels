using System.Collections.Concurrent;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Core;
using Serilog.Events;
using Umbraco.Community.LogLevels.Engine;
using Xunit;

namespace Umbraco.Community.LogLevels.Tests.Engine;

public sealed class LogLevelsStoreTests
{
    [Fact]
    public void CachedSerilogLoggersUseNewDefaultAndExistingOverrideImmediately()
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        var general = logger.ForContext("SourceContext", "Other.Component");
        var xyz = logger.ForContext("SourceContext", "xyz.Component");
        general.Information("before general");
        xyz.Debug("before xyz");
        xyz.Information("startup xyz");
        store.Apply(new("Information", [new("xyz", "Debug")], store.GetSettings().Revision));
        general.Information("after general");
        xyz.Debug("after xyz");
        Assert.Equal(["startup xyz", "after general", "after xyz"], sink.Messages);
    }

    [Fact]
    public void CachedMicrosoftLoggerUsesNewNamespaceOverride()
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        using var factory = LoggerFactory.Create(builder => builder.SetMinimumLevel(LogLevel.Trace).AddSerilog(logger));
        var typed = factory.CreateLogger<NewNamespaceComponent>();
        typed.LogDebug("before");
        store.Apply(new("Information", [new(typeof(NewNamespaceComponent).FullName!, "Debug")], store.GetSettings().Revision));
        typed.LogDebug("after");
        Assert.Equal(["after"], sink.Messages);
    }

    [Fact]
    public void NewOverrideAffectsAlreadyCreatedSerilogLogger()
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        var cached = logger.ForContext("SourceContext", "brandnew.Component");
        cached.Debug("before");
        store.Apply(new("Warning", [new("brandnew", "Debug")], store.GetSettings().Revision));
        cached.Debug("after");
        Assert.Equal(["after"], sink.Messages);
    }

    [Fact]
    public void RemovingChildOverrideRestoresParentAndParentChangesReachCachedChild()
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        var cached = logger.ForContext("SourceContext", "xyz.Child.Component");
        store.Apply(new("Warning", [new("xyz", "Information"), new("xyz.Child", "Debug")], store.GetSettings().Revision));
        cached.Debug("child debug");
        store.Apply(new("Warning", [new("xyz", "Information")], store.GetSettings().Revision));
        cached.Debug("removed debug");
        cached.Information("parent information");
        store.Apply(new("Warning", [new("xyz", "Error")], store.GetSettings().Revision));
        cached.Warning("parent now error");
        cached.Error("parent error");
        Assert.Equal(["child debug", "parent information", "parent error"], sink.Messages);
    }

    [Fact]
    public void RemovingLastOverrideRestoresDefaultForCachedLogger()
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        var cached = logger.ForContext("SourceContext", "xyz.Child");
        cached.Information("override");
        store.Apply(new("Error", [], store.GetSettings().Revision));
        cached.Warning("below default");
        cached.Error("default");
        Assert.Equal(["override", "default"], sink.Messages);
    }

    [Fact]
    public void NamespaceMatchesExactAndDottedChildrenButNotSimilarPrefix()
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        logger.ForContext("SourceContext", "xyz").Information("exact");
        logger.ForContext("SourceContext", "xyz.Child").Information("child");
        logger.ForContext("SourceContext", "xyzOther").Information("unrelated");
        logger.Information("no source");
        Assert.Equal(["exact", "child"], sink.Messages);
    }

    [Fact]
    public void ResetRestoresStartupDefaultAndOverridesForCachedLoggers()
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        var cached = logger.ForContext("SourceContext", "xyz.Child");
        store.Apply(new("Verbose", [new("xyz", "Verbose"), new("new", "Debug")], store.GetSettings().Revision));
        var reset = store.Reset(store.GetSettings().Revision);
        cached.Debug("discarded");
        cached.Information("restored");
        logger.Information("discarded default");
        logger.Warning("restored default");
        Assert.Equal("Warning", reset.Current.DefaultLevel);
        Assert.Equal(new LogLevelOverride("xyz", "Information"), Assert.Single(reset.Current.Overrides));
        Assert.Equal(["restored", "restored default"], sink.Messages);
    }

    [Theory]
    [InlineData("NoSuchLevel", "xyz", "Debug")]
    [InlineData("1", "xyz", "Debug")]
    [InlineData("Warning", "xyz", "NoSuchLevel")]
    [InlineData("Warning", "xyz", "-1")]
    [InlineData("Warning", "", "Debug")]
    [InlineData("Warning", " ", "Debug")]
    [InlineData("Warning", ".xyz", "Debug")]
    [InlineData("Warning", "xyz.", "Debug")]
    [InlineData("Warning", "xyz..Child", "Debug")]
    [InlineData("Warning", "xyz Child", "Debug")]
    public void InvalidUpdateLeavesWholeConfigurationAndRevisionUnchanged(string defaultLevel, string source, string level)
    {
        var store = CreateStore();
        var before = store.GetSettings();
        Assert.ThrowsAny<ArgumentException>(() => store.Apply(new(defaultLevel, [new(source, level)], before.Revision)));
        var after = store.GetSettings();
        Assert.Equal(before.Revision, after.Revision);
        Assert.Equal(before.Current.DefaultLevel, after.Current.DefaultLevel);
        Assert.Equal(before.Current.Overrides, after.Current.Overrides);
    }

    [Fact]
    public void DuplicateNamespaceRejectsWholeUpdate()
    {
        var store = CreateStore();
        var before = store.GetSettings();
        Assert.ThrowsAny<ArgumentException>(() => store.Apply(new("Debug", [new("xyz", "Error"), new("xyz", "Verbose")], before.Revision)));
        Assert.Equal(before.Revision, store.GetSettings().Revision);
        Assert.Equal("Warning", store.GetSettings().Current.DefaultLevel);
        Assert.Equal(new LogLevelOverride("xyz", "Information"), Assert.Single(store.GetSettings().Current.Overrides));
    }

    [Fact]
    public void StaleApplyAndResetCannotOverwriteAnotherUsersChange()
    {
        var store = CreateStore();
        var initial = store.GetSettings();
        var applied = store.Apply(new("Error", [], initial.Revision));
        Assert.Throws<LogLevelsConflictException>(() => store.Apply(new("Debug", [], initial.Revision)));
        Assert.Throws<LogLevelsConflictException>(() => store.Reset(initial.Revision));
        Assert.Equal(applied.Revision, store.GetSettings().Revision);
        Assert.Equal("Error", store.GetSettings().Current.DefaultLevel);
    }

    [Fact]
    public async Task ConcurrentUpdatesAtSameRevisionAllowExactlyOneWinner()
    {
        var store = CreateStore();
        var revision = store.GetSettings().Revision;
        var outcomes = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Task.Run(() =>
        {
            try { store.Apply(new("Error", [], revision)); return true; }
            catch (LogLevelsConflictException) { return false; }
        })));
        Assert.Single(outcomes, success => success);
        Assert.Equal("Error", store.GetSettings().Current.DefaultLevel);
    }

    [Fact]
    public void EmptyConfigurationUsesSerilogInformationDefault()
    {
        var store = new LogLevelsStore(new ConfigurationBuilder().Build());
        Assert.Equal("Information", store.GetSettings().Current.DefaultLevel);
        Assert.Empty(store.GetSettings().Current.Overrides);
    }

    [Fact]
    public void NamespaceMatchingIsCaseInsensitiveAndDuplicateCaseVariantsAreRejected()
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        logger.ForContext("SourceContext", "XYZ.Child").Information("case variant");
        Assert.Equal(["case variant"], sink.Messages);
        Assert.ThrowsAny<ArgumentException>(() => store.Apply(new("Debug", [new("xyz", "Error"), new("XYZ", "Verbose")], store.GetSettings().Revision)));
        Assert.Equal("Warning", store.GetSettings().Current.DefaultLevel);
    }

    [Theory]
    [InlineData("Verbose", LogEventLevel.Verbose)]
    [InlineData("Debug", LogEventLevel.Debug)]
    [InlineData("Information", LogEventLevel.Information)]
    [InlineData("Warning", LogEventLevel.Warning)]
    [InlineData("Error", LogEventLevel.Error)]
    [InlineData("Fatal", LogEventLevel.Fatal)]
    public void EachLevelIncludesItsBoundaryAndHigherAndExcludesLower(string minimum, LogEventLevel threshold)
    {
        var store = CreateStore();
        var sink = new CapturingSink();
        using var logger = CreateLogger(store, sink);
        store.Apply(new(minimum, [], store.GetSettings().Revision));
        foreach (var level in Enum.GetValues<LogEventLevel>()) logger.Write(level, "{Level}", level.ToString());
        Assert.Equal(Enum.GetValues<LogEventLevel>().Where(level => level >= threshold).Select(level => "\"" + level + "\""), sink.Messages);
    }

    [Fact]
    public void OverrideLimitsAcceptBoundaryAndRejectNextValueAtomically()
    {
        var store = CreateStore();
        var maximum = Enumerable.Range(0, 256).Select(index => new LogLevelOverride("Prefix" + index, "Debug")).ToArray();
        var applied = store.Apply(new("Warning", maximum, store.GetSettings().Revision));
        Assert.Equal(256, applied.Current.Overrides.Count);
        Assert.ThrowsAny<ArgumentException>(() => store.Apply(new("Debug", [..maximum, new("Extra", "Debug")], applied.Revision)));
        Assert.ThrowsAny<ArgumentException>(() => store.Apply(new("Debug", [new(new string('a', 257), "Debug")], applied.Revision)));
        var longPrefix = store.Apply(new("Warning", [new(new string('a', 256), "Debug")], applied.Revision));
        Assert.Equal(256, Assert.Single(longPrefix.Current.Overrides).Source.Length);
    }
    [Theory]
    [InlineData(-1L)]
    [InlineData(long.MaxValue)]
    public void InvalidRevisionIsRejectedWithoutChangingState(long revision)
    {
        var store = CreateStore();
        Assert.ThrowsAny<ArgumentException>(() => store.Apply(new("Debug", [], revision)));
        Assert.Equal(0, store.GetSettings().Revision);
        Assert.Equal("Warning", store.GetSettings().Current.DefaultLevel);
    }

    [Fact]
    public void CallerCannotMutateAppliedRulesByChangingItsInputCollection()
    {
        var store = CreateStore();
        LogLevelOverride[] input = [new("xyz", "Error")];
        store.Apply(new("Warning", input, store.GetSettings().Revision));
        input[0] = new("xyz", "Verbose");
        Assert.Equal(new LogLevelOverride("xyz", "Error"), Assert.Single(store.GetSettings().Current.Overrides));
        Assert.Equal(new LogLevelOverride("xyz", "Information"), Assert.Single(store.GetSettings().Startup.Overrides));
    }
    private static LogLevelsStore CreateStore() => new(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["Serilog:MinimumLevel:Default"] = "Warning",
        ["Serilog:MinimumLevel:Override:xyz"] = "Information"
    }).Build());

    private static Logger CreateLogger(LogLevelsStore store, CapturingSink sink) => new LoggerConfiguration()
        .MinimumLevel.Verbose().Filter.With(store).WriteTo.Sink(sink).CreateLogger();



    private sealed class CapturingSink : ILogEventSink
    {
        private readonly ConcurrentQueue<string> _messages = new();
        public string[] Messages => _messages.ToArray();
        public void Emit(LogEvent logEvent) => _messages.Enqueue(logEvent.RenderMessage());
    }
}

public sealed class NewNamespaceComponent;

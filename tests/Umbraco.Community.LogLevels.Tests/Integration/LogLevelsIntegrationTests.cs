using System.Collections.Concurrent;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Core;
using Serilog.Events;
using Umbraco.Community.LogLevels.Engine;
using Umbraco.Community.LogLevels.Integration;
using Xunit;

namespace Umbraco.Community.LogLevels.Tests.Integration;

public sealed class LogLevelsIntegrationTests
{
    [Fact]
    public void EarlyIntegrationPreservesStartupRulesAndEnablesLowerLevelsInCachedBootstrapRuntimeAndMicrosoftLoggers()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:Default"] = "Warning",
            ["Serilog:MinimumLevel:Override:xyz"] = "Information"
        });
        builder.AddLogLevels();
        using var services = builder.Services.BuildServiceProvider();
        var store = services.GetRequiredService<LogLevelsStore>();
        var sink = new CapturingSink();
        using var bootstrap = new LoggerConfiguration().ReadFrom.Configuration(builder.Configuration).WriteTo.Sink(sink).CreateLogger();
        using var runtime = new LoggerConfiguration().ReadFrom.Configuration(builder.Configuration).WriteTo.Sink(sink).CreateLogger();
        var bootstrapXyz = bootstrap.ForContext("SourceContext", "xyz.Bootstrap");
        var runtimeXyz = runtime.ForContext("SourceContext", "xyz.Runtime");
        var brandnew = runtime.ForContext("SourceContext", "brandnew.Component");
        using var factory = LoggerFactory.Create(logging => logging.SetMinimumLevel(LogLevel.Trace).AddSerilog(runtime));
        var microsoft = factory.CreateLogger<IntegrationComponent>();
        runtime.Information("before default");
        runtimeXyz.Debug("before xyz");
        runtimeXyz.Information("startup xyz");
        brandnew.Debug("before new");
        microsoft.LogDebug("before microsoft");

        store.Apply(new("Information", [new("xyz", "Debug"), new("brandnew", "Debug"),
            new(typeof(IntegrationComponent).FullName!, "Debug")], store.GetSettings().Revision));
        runtime.Information("after default");
        bootstrapXyz.Debug("after bootstrap");
        runtimeXyz.Debug("after xyz");
        brandnew.Debug("after new");
        microsoft.LogDebug("after microsoft");

        Assert.Equal(["startup xyz", "after default", "after bootstrap", "after xyz", "after new", "after microsoft"], sink.Messages);
        Assert.Equal("Warning", store.GetSettings().Startup.DefaultLevel);
        Assert.Equal(new LogLevelOverride("xyz", "Information"), Assert.Single(store.GetSettings().Startup.Overrides));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void ScalarAndControlledByStartupDefaultsCanBeLowered(bool controlledBy)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.Configuration.AddInMemoryCollection(controlledBy
            ? new Dictionary<string, string?> { ["Serilog:MinimumLevel:ControlledBy"] = "$default", ["Serilog:LevelSwitches:default"] = "Warning" }
            : new Dictionary<string, string?> { ["Serilog:MinimumLevel"] = "Warning" });
        builder.AddLogLevels();
        using var services = builder.Services.BuildServiceProvider();
        var store = services.GetRequiredService<LogLevelsStore>();
        var sink = new CapturingSink();
        using var logger = new LoggerConfiguration().ReadFrom.Configuration(builder.Configuration).WriteTo.Sink(sink).CreateLogger();
        logger.Debug("before");
        store.Apply(new("Debug", [], store.GetSettings().Revision));
        logger.Debug("after");
        Assert.Equal("Warning", store.GetSettings().Startup.DefaultLevel);
        Assert.Equal(["after"], sink.Messages);
    }

    [Fact]
    public void SinkSpecificThresholdStillAppliesAfterRuntimeChange()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.AddLogLevels();
        using var services = builder.Services.BuildServiceProvider();
        var store = services.GetRequiredService<LogLevelsStore>();
        var sink = new CapturingSink();
        using var logger = new LoggerConfiguration().ReadFrom.Configuration(builder.Configuration)
            .WriteTo.Sink(sink, restrictedToMinimumLevel: LogEventLevel.Error).CreateLogger();
        store.Apply(new("Debug", [], store.GetSettings().Revision));
        logger.Debug("sink discards");
        logger.Error("sink accepts");
        Assert.Equal(["sink accepts"], sink.Messages);
    }

    [Fact]
    public void RepeatedRegistrationFailsClearly()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.AddLogLevels();
        Assert.Throws<InvalidOperationException>(() => builder.AddLogLevels());
    }

    [Fact]
    public void DollarPrefixedSwitchDeclarationsAreUsedAsStartupRules()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:ControlledBy"] = "$default",
            ["Serilog:MinimumLevel:Override:xyz"] = "$xyz",
            ["Serilog:LevelSwitches:$default"] = "Warning",
            ["Serilog:LevelSwitches:$xyz"] = "Information"
        });
        builder.AddLogLevels();
        using var services = builder.Services.BuildServiceProvider();
        var store = services.GetRequiredService<LogLevelsStore>();
        Assert.Equal("Warning", store.GetSettings().Startup.DefaultLevel);
        Assert.Equal(new LogLevelOverride("xyz", "Information"), Assert.Single(store.GetSettings().Startup.Overrides));
        var sink = new CapturingSink();
        using var logger = new LoggerConfiguration().ReadFrom.Configuration(builder.Configuration).WriteTo.Sink(sink).CreateLogger();
        var cached = logger.ForContext("SourceContext", "xyz.Child");
        cached.Debug("before");
        store.Apply(new("Debug", [new("xyz", "Verbose")], store.GetSettings().Revision));
        cached.Verbose("after");
        Assert.Equal(["after"], sink.Messages);
    }
    [Theory]
    [InlineData(true, "Warning", LogEventLevel.Warning)]
    [InlineData(false, "Debug", LogEventLevel.Debug)]
    public void StartupMinimumUsesHighestProviderAcrossScalarAndObjectShapes(bool higherProviderIsScalar, string expected, LogEventLevel threshold)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.Configuration.AddInMemoryCollection(higherProviderIsScalar
            ? new Dictionary<string, string?> { ["Serilog:MinimumLevel:Default"] = "Information" }
            : new Dictionary<string, string?> { ["Serilog:MinimumLevel"] = "Warning" });
        builder.Configuration.AddInMemoryCollection(higherProviderIsScalar
            ? new Dictionary<string, string?> { ["Serilog:MinimumLevel"] = "Warning" }
            : new Dictionary<string, string?> { ["Serilog:MinimumLevel:Default"] = "Debug" });
        AssertNativeAndIntegratedThresholds(builder, expected, threshold);
    }

    [Fact]
    public void ScalarMinimumWinsOverObjectDefaultInSameProvider()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel"] = "Warning",
            ["Serilog:MinimumLevel:Default"] = "Debug"
        });
        AssertNativeAndIntegratedThresholds(builder, "Warning", LogEventLevel.Warning);
    }

    [Fact]
    public void ControlledByRemainsEffectiveWhenHigherProviderChangesMinimumShape()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:ControlledBy"] = "$baseline",
            ["Serilog:LevelSwitches:baseline"] = "Error",
            ["Serilog:MinimumLevel:Default"] = "Information"
        });
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Serilog:MinimumLevel"] = "Debug" });
        AssertNativeAndIntegratedThresholds(builder, "Error", LogEventLevel.Error);
    }

    private static void AssertNativeAndIntegratedThresholds(WebApplicationBuilder builder, string expected, LogEventLevel threshold)
    {
        var nativeSink = new CapturingSink();
        using var native = new LoggerConfiguration().ReadFrom.Configuration(builder.Configuration).WriteTo.Sink(nativeSink).CreateLogger();
        foreach (var level in Enum.GetValues<LogEventLevel>()) native.Write(level, "{Level}", level.ToString());
        builder.AddLogLevels();
        using var services = builder.Services.BuildServiceProvider();
        var store = services.GetRequiredService<LogLevelsStore>();
        Assert.Equal(expected, store.GetSettings().Startup.DefaultLevel);
        var integratedSink = new CapturingSink();
        using var integrated = new LoggerConfiguration().ReadFrom.Configuration(builder.Configuration).WriteTo.Sink(integratedSink).CreateLogger();
        foreach (var level in Enum.GetValues<LogEventLevel>())
        {
            integrated.Write(level, "{Level}", level.ToString());
        }
        Assert.Equal(Enum.GetValues<LogEventLevel>().Where(level => level >= threshold).Select(level => "\"" + level + "\""), nativeSink.Messages);
        Assert.Equal(nativeSink.Messages, integratedSink.Messages);
        store.Apply(new("Verbose", [], store.GetSettings().Revision));
        store.Reset(store.GetSettings().Revision);
        Assert.Equal(expected, store.GetSettings().Current.DefaultLevel);
    }
    private sealed class CapturingSink : ILogEventSink
    {
        private readonly ConcurrentQueue<string> _messages = new();
        public string[] Messages => _messages.ToArray();
        public void Emit(LogEvent logEvent) => _messages.Enqueue(logEvent.RenderMessage());
    }
}

public sealed class IntegrationComponent;

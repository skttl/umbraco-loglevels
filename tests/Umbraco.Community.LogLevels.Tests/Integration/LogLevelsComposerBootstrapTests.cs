using System.Collections.Concurrent;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Core;
using Serilog.Events;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Community.LogLevels.Engine;
using Umbraco.Community.LogLevels.Integration;
using Xunit;

namespace Umbraco.Community.LogLevels.Tests.Integration;

[Collection("GlobalSerilog")]
public sealed class LogLevelsComposerBootstrapTests
{
    [Fact]
    public void ComposerReloadAndFreezeUpdatesAlreadyCachedSerilogAndMicrosoftLoggersWithoutExplicitSetup()
    {
        var configuration = StartupConfiguration();
        var sink = new CapturingSink();
        using var bootstrap = new LoggerConfiguration().ReadFrom.Configuration(configuration).WriteTo.Sink(sink).CreateBootstrapLogger();
        using var global = new GlobalLoggerScope(bootstrap);
        var general = bootstrap.ForContext("SourceContext", "Other.Component");
        var xyz = bootstrap.ForContext("SourceContext", "xyz.Child");
        var added = bootstrap.ForContext("SourceContext", "brandnew.Child");
        using var factory = LoggerFactory.Create(logging => logging.SetMinimumLevel(LogLevel.Trace).AddSerilog(bootstrap));
        var microsoft = factory.CreateLogger<AutoSetupComponent>();
        general.Information("before general");
        xyz.Debug("before xyz");
        xyz.Information("startup xyz");
        added.Debug("before new");
        microsoft.LogDebug("before microsoft");

        IServiceCollection services = new ServiceCollection();
        new LogLevelsComposer().Compose(CreateBuilder(services, configuration));
        using var provider = services.BuildServiceProvider();
        var store = provider.GetRequiredService<LogLevelsStore>();
        general.Information("between composer and reload general");
        xyz.Debug("between composer and reload xyz");
        microsoft.LogDebug("between composer and reload microsoft");
        bootstrap.Reload(logger => logger.ReadFrom.Configuration(configuration).WriteTo.Sink(sink));
        using var frozen = bootstrap.Freeze();
        Assert.Equal("Warning", store.GetSettings().Startup.DefaultLevel);
        store.Apply(new("Information", [new("xyz", "Debug"), new("brandnew", "Debug"),
            new(typeof(AutoSetupComponent).FullName!, "Debug")], store.GetSettings().Revision));
        general.Information("after general");
        xyz.Debug("after xyz");
        added.Debug("after new");
        microsoft.LogDebug("after microsoft");
        store.Apply(new("Information", [new("xyz", "Debug")], store.GetSettings().Revision));
        added.Debug("removed new");
        microsoft.LogDebug("removed microsoft");
        added.Information("inherited new");
        store.Reset(store.GetSettings().Revision);
        general.Information("reset default suppressed");
        xyz.Debug("reset xyz suppressed");
        xyz.Information("reset xyz");
        Assert.Equal(["startup xyz", "after general", "after xyz", "after new", "after microsoft", "inherited new", "reset xyz"], sink.Messages);
    }

    [Fact]
    public void ExplicitSetupThenRepeatedComposerKeepsSingleStoreAndFilter()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Serilog:MinimumLevel:Default"] = "Warning" });
        builder.AddLogLevels();
        using var before = builder.Services.BuildServiceProvider();
        var original = before.GetRequiredService<LogLevelsStore>();
        var umbraco = CreateBuilder(builder.Services, builder.Configuration);
        var composer = new LogLevelsComposer();
        composer.Compose(umbraco);
        composer.Compose(umbraco);
        using var after = builder.Services.BuildServiceProvider();
        Assert.Same(original, after.GetRequiredService<LogLevelsStore>());
        Assert.Single(builder.Services, descriptor => descriptor.ServiceType == typeof(LogLevelsStore));
        Assert.Single(builder.Configuration.GetSection("Serilog:Filter").GetChildren(), section => section["Name"] == "LogLevelsRuntime");
        Assert.Equal("Warning", original.GetSettings().Startup.DefaultLevel);
    }

    [Fact]
    public void ImmutableConfigurationWithoutExplicitSetupFailsWithActionableMessage()
    {
        IServiceCollection services = new ServiceCollection();
        var immutable = new ConfigurationBuilder().AddInMemoryCollection().Build();
        var exception = Assert.Throws<InvalidOperationException>(() => new LogLevelsComposer().Compose(CreateBuilder(services, immutable)));
        Assert.Contains("configuration", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(services, descriptor => descriptor.ServiceType == typeof(LogLevelsStore));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void AutomaticSetupRejectsCustomOrAlreadyFrozenLogger(bool frozenBootstrap)
    {
        using var bootstrap = new LoggerConfiguration().CreateBootstrapLogger();
        using var custom = new LoggerConfiguration().CreateLogger();
        if (frozenBootstrap) bootstrap.Freeze();
        using var global = new GlobalLoggerScope(frozenBootstrap ? bootstrap : custom);
        IServiceCollection services = new ServiceCollection();
        Assert.Throws<InvalidOperationException>(() => new LogLevelsComposer().Compose(CreateBuilder(services, StartupConfiguration())));
        Assert.DoesNotContain(services, descriptor => descriptor.ServiceType == typeof(LogLevelsStore));
    }

    public sealed class GlobalLoggerScope : IDisposable
    {
        private readonly Serilog.ILogger _previous = Log.Logger;
        public GlobalLoggerScope(Serilog.ILogger logger) => Log.Logger = logger;
        public void Dispose() => Log.Logger = _previous;
    }
    private static ConfigurationManager StartupConfiguration()
    {
        var configuration = new ConfigurationManager();
        configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:Default"] = "Warning",
            ["Serilog:MinimumLevel:Override:xyz"] = "Information"
        });
        return configuration;
    }

    private static IUmbracoBuilder CreateBuilder(IServiceCollection services, IConfiguration configuration)
    {
        var builder = DispatchProxy.Create<IUmbracoBuilder, LogLevelsLogViewerTests.BuilderProxy>();
        var proxy = (LogLevelsLogViewerTests.BuilderProxy)(object)builder;
        proxy.Services = services;
        proxy.Config = configuration;
        return builder;
    }

    private sealed class CapturingSink : ILogEventSink
    {
        private readonly ConcurrentQueue<string> _messages = new();
        public string[] Messages => _messages.ToArray();
        public void Emit(LogEvent logEvent) => _messages.Enqueue(logEvent.RenderMessage());
    }
}

public sealed class AutoSetupComponent;


[CollectionDefinition("GlobalSerilog", DisableParallelization = true)]
public sealed class GlobalSerilogCollection;

using System.Collections.Concurrent;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Serilog.Configuration;
using Serilog.Core;
using Serilog.Extensions.Hosting;
using Umbraco.Community.LogLevels.Engine;

namespace Umbraco.Community.LogLevels.Integration;

public static class LogLevelsBuilderExtensions
{
    private static readonly ConcurrentDictionary<string, WeakReference<LogLevelsStore>> Stores = new();

    /// <summary>Optionally enable LogLevels before Umbraco's bootstrap logger is created.</summary>
    public static WebApplicationBuilder AddLogLevels(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        if (builder.Services.Any(service => service.ServiceType == typeof(LogLevelsStore)))
            throw new InvalidOperationException("AddLogLevels must only be called once, before CreateUmbracoBuilder.");
        if (builder.Services.Any(service => service.ServiceType == typeof(Serilog.ILogger)))
            throw new InvalidOperationException("Call AddLogLevels before CreateUmbracoBuilder so bootstrap logging is configured safely.");

        Configure(builder.Services, builder.Configuration, requireBootstrapLogger: false);
        return builder;
    }

    internal static void Configure(IServiceCollection services, IConfiguration configuration, bool requireBootstrapLogger = true)
    {
        if (services.Any(service => service.ServiceType == typeof(LogLevelsStore)))
            return;
        if (configuration is not IConfigurationBuilder configurationBuilder)
            throw new InvalidOperationException("Automatic LogLevels setup requires mutable configuration. Use WebApplication.CreateBuilder and AddComposers, or call AddLogLevels on the WebApplicationBuilder before creating the Umbraco builder.");
        if (requireBootstrapLogger &&
            (Log.Logger is not ReloadableLogger bootstrap || bootstrap.ForContext("LogLevelsInitialization", true) is Logger))
            throw new InvalidOperationException("Automatic LogLevels setup must run through AddComposers before Umbraco's bootstrap logger is frozen or replaced. For custom logging startup, call AddLogLevels before CreateUmbracoBuilder.");

        var store = new LogLevelsStore(configuration);
        var id = Guid.NewGuid().ToString("N");
        var nativeSwitch = "LogLevels" + id;
        foreach (var entry in Stores)
            if (!entry.Value.TryGetTarget(out _))
                Stores.TryRemove(entry.Key, out _);
        Stores[id] = new WeakReference<LogLevelsStore>(store);
        services.AddSingleton(store);

        var overrides = new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:ControlledBy"] = "$" + nativeSwitch,
            [$"Serilog:LevelSwitches:{nativeSwitch}"] = "Verbose",
        };
        foreach (var item in store.GetSettings().Startup.Overrides)
            overrides[$"Serilog:MinimumLevel:Override:{item.Source}"] = "$" + nativeSwitch;

        var usingKey = NextIndex(configuration.GetSection("Serilog:Using"));
        var filterKey = NextIndex(configuration.GetSection("Serilog:Filter"));
        overrides[$"Serilog:Using:{usingKey}"] = typeof(LogLevelsBuilderExtensions).Assembly.GetName().Name;
        overrides[$"Serilog:Filter:{filterKey}:Name"] = nameof(LogLevelsRuntime);
        overrides[$"Serilog:Filter:{filterKey}:Args:instanceId"] = id;

        // Existing bootstrap switches retain their levels: their reload callbacks cannot parse switch references.
        // The runtime logger resolves the new permissive switch and delegates thresholds to our shared filter.
        configurationBuilder.AddInMemoryCollection(overrides);
    }

    /// <summary>Serilog configuration hook shared by Umbraco's bootstrap and runtime loggers.</summary>
    public static LoggerConfiguration LogLevelsRuntime(this LoggerFilterConfiguration filterConfiguration, string instanceId)
    {
        if (!Stores.TryGetValue(instanceId, out var reference) || !reference.TryGetTarget(out var store))
            throw new InvalidOperationException("LogLevels is not initialized. Ensure Umbraco's AddComposers runs before runtime logging is created.");
        return filterConfiguration.With(store);
    }

    private static int NextIndex(IConfigurationSection section) => section.GetChildren()
        .Select(child => int.TryParse(child.Key, out var index) ? index : -1)
        .DefaultIfEmpty(-1).Max() + 1;
}

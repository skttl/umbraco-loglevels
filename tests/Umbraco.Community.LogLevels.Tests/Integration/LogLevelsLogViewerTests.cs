using Serilog;
using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Services.Implement;
using Umbraco.Community.LogLevels.Engine;
using Umbraco.Community.LogLevels.Integration;
using Xunit;
using UmbracoLogLevel = Umbraco.Cms.Core.Logging.LogLevel;

namespace Umbraco.Community.LogLevels.Tests.Integration;

[Collection("GlobalSerilog")]
public sealed class LogLevelsLogViewerTests
{
    [Fact]
    public void NativeOverviewReflectsEffectiveDefaultAfterApplyAndReset()
    {
        var store = new LogLevelsStore(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:Default"] = "Warning"
        }).Build());
        var repository = new LogLevelsLogViewerRepository(null!, null!, null!, null!, store);
        Assert.Equal(UmbracoLogLevel.Warning, repository.GetGlobalMinLogLevel());
        store.Apply(new("Information", [], store.GetSettings().Revision));
        Assert.Equal(UmbracoLogLevel.Information, repository.GetGlobalMinLogLevel());
        store.Reset(store.GetSettings().Revision);
        Assert.Equal(UmbracoLogLevel.Warning, repository.GetGlobalMinLogLevel());
    }

    [Theory]
    [InlineData(ServiceLifetime.Singleton)]
    [InlineData(ServiceLifetime.Scoped)]
    [InlineData(ServiceLifetime.Transient)]
    public void ComposerReplacesStockRepositoryAndPreservesLifetime(ServiceLifetime lifetime)
    {
        IServiceCollection services = new ServiceCollection();
        services.AddSingleton(new LogLevelsStore(new ConfigurationBuilder().Build()));
        services.Add(ServiceDescriptor.Describe(typeof(ILogViewerRepository), typeof(LogViewerRepository), lifetime));
        new LogLevelsComposer().Compose(CreateBuilder(services));
        var registration = Assert.Single(services, descriptor => descriptor.ServiceType == typeof(ILogViewerRepository));
        Assert.Equal(typeof(LogLevelsLogViewerRepository), registration.ImplementationType);
        Assert.Equal(lifetime, registration.Lifetime);
    }

    [Fact]
    public void ComposerPreservesCustomFactoryRepositoryRegistration()
    {
        IServiceCollection services = new ServiceCollection();
        services.AddSingleton(new LogLevelsStore(new ConfigurationBuilder().Build()));
        var stock = ServiceDescriptor.Singleton<ILogViewerRepository, LogViewerRepository>();
        var custom = ServiceDescriptor.Scoped<ILogViewerRepository>(_ => throw new NotSupportedException("custom factory"));
        services.Add(stock);
        services.Add(custom);
        new LogLevelsComposer().Compose(CreateBuilder(services));
        var registrations = services.Where(descriptor => descriptor.ServiceType == typeof(ILogViewerRepository)).ToArray();
        Assert.Equal(2, registrations.Length);
        Assert.Same(stock, registrations[0]);
        Assert.Same(custom, registrations[1]);
    }

    [Fact]
    public void ComposerWithoutExplicitSetupRegistersStoreAndUpdatesStockRepository()
    {
        using var bootstrap = new LoggerConfiguration().CreateBootstrapLogger();
        using var global = new LogLevelsComposerBootstrapTests.GlobalLoggerScope(bootstrap);
        IServiceCollection services = new ServiceCollection();
        var stock = ServiceDescriptor.Singleton<ILogViewerRepository, LogViewerRepository>();
        services.Add(stock);
        new LogLevelsComposer().Compose(CreateBuilder(services));
        Assert.Single(services, descriptor => descriptor.ServiceType == typeof(LogLevelsStore));
        Assert.Equal(typeof(LogLevelsLogViewerRepository), Assert.Single(services, descriptor => descriptor.ServiceType == typeof(ILogViewerRepository)).ImplementationType);
    }

    [Fact]
    public void ComposerWithoutRepositoryDoesNotAddOne()
    {
        IServiceCollection services = new ServiceCollection();
        services.AddSingleton(new LogLevelsStore(new ConfigurationBuilder().Build()));
        new LogLevelsComposer().Compose(CreateBuilder(services));
        Assert.DoesNotContain(services, descriptor => descriptor.ServiceType == typeof(ILogViewerRepository));
    }

    [Fact]
    public void ComposerPreservesCustomRepositoryTypeAndLifetime()
    {
        IServiceCollection services = new ServiceCollection();
        services.AddSingleton(new LogLevelsStore(new ConfigurationBuilder().Build()));
        var custom = ServiceDescriptor.Scoped<ILogViewerRepository, CustomLogViewerRepository>();
        services.Add(custom);
        new LogLevelsComposer().Compose(CreateBuilder(services));
        Assert.Same(custom, Assert.Single(services, descriptor => descriptor.ServiceType == typeof(ILogViewerRepository)));
    }

    private sealed class CustomLogViewerRepository() : LogViewerRepository(null!, null!, null!, null!);
    private static IUmbracoBuilder CreateBuilder(IServiceCollection services)
    {
        var builder = DispatchProxy.Create<IUmbracoBuilder, BuilderProxy>();
        ((BuilderProxy)(object)builder).Services = services;
        return builder;
    }

    public class BuilderProxy : DispatchProxy
    {
        public IServiceCollection Services { get; set; } = null!;
        public IConfiguration Config { get; set; } = new ConfigurationManager();
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) =>
            targetMethod?.Name switch
            {
                "get_Services" => Services,
                "get_Config" => Config,
                _ => throw new NotSupportedException(targetMethod?.Name)
            };
    }
}

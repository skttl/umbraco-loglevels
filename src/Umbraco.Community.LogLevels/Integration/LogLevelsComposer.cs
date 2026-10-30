using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Services.Implement;

namespace Umbraco.Community.LogLevels.Integration;

public sealed class LogLevelsComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        LogLevelsBuilderExtensions.Configure(builder.Services, builder.Config);

        var registration = builder.Services.LastOrDefault(service => service.ServiceType == typeof(ILogViewerRepository));
        // Preserve custom log viewer repositories; only correct Umbraco's default global level indicator.
        if (registration?.ImplementationType == typeof(LogViewerRepository))
            builder.Services[builder.Services.IndexOf(registration)] = ServiceDescriptor.Describe(
                typeof(ILogViewerRepository), typeof(LogLevelsLogViewerRepository), registration.Lifetime);
    }
}

using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Logging;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Infrastructure.Logging.Serilog;
using Umbraco.Cms.Infrastructure.Services.Implement;
using Umbraco.Community.LogLevels.Engine;
using LogLevel = Umbraco.Cms.Core.Logging.LogLevel;

namespace Umbraco.Community.LogLevels.Integration;

public sealed class LogLevelsLogViewerRepository(
    ILoggingConfiguration loggingConfiguration,
    ILogger<LogViewerRepository> logger,
    IJsonSerializer jsonSerializer,
    UmbracoFileConfiguration umbracoFileConfiguration,
    LogLevelsStore store)
    : LogViewerRepository(loggingConfiguration, logger, jsonSerializer, umbracoFileConfiguration)
{
    public override LogLevel GetGlobalMinLogLevel() =>
        Enum.Parse<LogLevel>(store.GetSettings().Current.DefaultLevel);
}

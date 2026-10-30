using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Community.LogLevels.Engine;

namespace Umbraco.Community.LogLevels.Controllers;

[ApiVersion("1.0")]
[Route("umbraco/loglevels/api/v{version:apiVersion}/settings")]
[ApiExplorerSettings(GroupName = "LogLevels")]
[Authorize(Policy = AuthorizationPolicies.RequireAdminAccess)]
public sealed class LogLevelsController : ManagementApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(LogLevelsState), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public ActionResult<LogLevelsState> GetSettings(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var store = HttpContext.RequestServices.GetService<LogLevelsStore>();
        return store is null ? NotConfigured() : Ok(store.GetSettings());
    }

    [HttpPut]
    [RequestSizeLimit(131072)]
    [ProducesResponseType(typeof(LogLevelsState), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public ActionResult<LogLevelsState> UpdateSettings([FromBody] LogLevelsUpdate update, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var store = HttpContext.RequestServices.GetService<LogLevelsStore>();
        if (store is null)
            return NotConfigured();
        try
        {
            return Ok(store.Apply(update));
        }
        catch (ArgumentException exception)
        {
            return Problem(exception.Message, statusCode: StatusCodes.Status400BadRequest, title: "Invalid log levels");
        }
        catch (LogLevelsConflictException exception)
        {
            return Problem(exception.Message, statusCode: StatusCodes.Status409Conflict, title: "Log levels changed");
        }
    }

    [HttpDelete]
    [ProducesResponseType(typeof(LogLevelsState), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public ActionResult<LogLevelsState> ResetSettings([FromQuery, BindRequired] long revision, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var store = HttpContext.RequestServices.GetService<LogLevelsStore>();
        if (store is null)
            return NotConfigured();
        try
        {
            return Ok(store.Reset(revision));
        }
        catch (LogLevelsConflictException exception)
        {
            return Problem(exception.Message, statusCode: StatusCodes.Status409Conflict, title: "Log levels changed");
        }
    }

    private ObjectResult NotConfigured() => Problem(
        "LogLevels initializes through Umbraco's AddComposers. Ensure composers are enabled; for custom startup, optionally call builder.AddLogLevels() before builder.CreateUmbracoBuilder().",
        statusCode: StatusCodes.Status503ServiceUnavailable, title: "LogLevels is not configured");
}

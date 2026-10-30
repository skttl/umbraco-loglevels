using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Community.LogLevels.Controllers;
using Umbraco.Community.LogLevels.Engine;
using Xunit;

namespace Umbraco.Community.LogLevels.Tests.Controllers;

public sealed class LogLevelsControllerTests
{
    [Fact]
    public void ControllerRequiresAdminAuthorizationAndHasNoAnonymousActions()
    {
        var type = typeof(LogLevelsController);
        Assert.Contains(type.GetCustomAttributes<AuthorizeAttribute>(true), attribute => attribute.Policy == AuthorizationPolicies.RequireAdminAccess);
        Assert.Empty(type.GetCustomAttributes<AllowAnonymousAttribute>(true));
        foreach (var action in type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            Assert.Empty(action.GetCustomAttributes<AllowAnonymousAttribute>(true));
    }

    [Fact]
    public void UnconfiguredInstallationReturnsActionable503()
    {
        using var services = CreateServices();
        var controller = CreateController(services);
        var get = Assert.IsType<ObjectResult>(controller.GetSettings(CancellationToken.None).Result);
        var update = Assert.IsType<ObjectResult>(controller.UpdateSettings(new("Debug", [], 0), CancellationToken.None).Result);
        var reset = Assert.IsType<ObjectResult>(controller.ResetSettings(0, CancellationToken.None).Result);
        foreach (var response in new[] { get, update, reset })
        {
            Assert.Equal(503, response.StatusCode);
            Assert.Contains("AddLogLevels", Assert.IsType<ProblemDetails>(response.Value).Detail);
        }
    }

    [Fact]
    public void ValidUpdateReturnsCurrentStateAndStaleUpdateAndResetReturn409()
    {
        var store = new LogLevelsStore(new ConfigurationBuilder().Build());
        using var services = CreateServices(store);
        var controller = CreateController(services);
        var initial = store.GetSettings();
        var result = Assert.IsType<OkObjectResult>(controller.UpdateSettings(new("Debug", [new("xyz", "Error")], initial.Revision), CancellationToken.None).Result);
        var state = Assert.IsType<LogLevelsState>(result.Value);
        Assert.Equal("Debug", state.Current.DefaultLevel);
        Assert.Equal(new LogLevelOverride("xyz", "Error"), Assert.Single(state.Current.Overrides));
        var conflict = Assert.IsType<ObjectResult>(controller.UpdateSettings(new("Error", [], initial.Revision), CancellationToken.None).Result);
        var resetConflict = Assert.IsType<ObjectResult>(controller.ResetSettings(initial.Revision, CancellationToken.None).Result);
        Assert.Equal(409, conflict.StatusCode);
        Assert.Equal(409, resetConflict.StatusCode);
        Assert.Equal(state.Revision, store.GetSettings().Revision);
        var reset = Assert.IsType<OkObjectResult>(controller.ResetSettings(state.Revision, CancellationToken.None).Result);
        Assert.Equal("Information", Assert.IsType<LogLevelsState>(reset.Value).Current.DefaultLevel);
    }

    [Fact]
    public void InvalidUpdateReturns400AndPreservesRules()
    {
        var store = new LogLevelsStore(new ConfigurationBuilder().Build());
        using var services = CreateServices(store);
        var controller = CreateController(services);
        var response = Assert.IsType<ObjectResult>(controller.UpdateSettings(new("Bogus", [], 0), CancellationToken.None).Result);
        Assert.Equal(400, response.StatusCode);
        Assert.IsType<ProblemDetails>(response.Value);
        Assert.Equal("Information", store.GetSettings().Current.DefaultLevel);
        Assert.Equal(0, store.GetSettings().Revision);
    }

    private static ServiceProvider CreateServices(LogLevelsStore? store = null)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddControllers();
        if (store is not null) services.AddSingleton(store);
        return services.BuildServiceProvider();
    }

    private static LogLevelsController CreateController(IServiceProvider services) => new()
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { RequestServices = services } }
    };
}

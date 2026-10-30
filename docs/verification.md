# Local verification

Verified on 2026-10-23 against Umbraco 17.0.0 with .NET SDK 10.0.401.

## Automated checks

The release-mode solution tests pass: **59 passed, 0 failed, 0 skipped**. They cover the following observable behavior. Test names are in `tests/Umbraco.Community.LogLevels.Tests/`.

| Requirement | Evidence |
|---|---|
| Automatic composer setup, cached bootstrap/runtime loggers and no premature verbose events | `ComposerReloadAndFreezeUpdatesAlreadyCachedSerilogAndMicrosoftLoggersWithoutExplicitSetup` |
| Repeated setup and unsupported startup | `ExplicitSetupThenRepeatedComposerKeepsSingleStoreAndFilter`, `ImmutableConfigurationWithoutExplicitSetupFailsWithActionableMessage`, `AutomaticSetupRejectsCustomOrAlreadyFrozenLogger` |
| Existing default/override changes reach cached Serilog and Microsoft loggers | `EarlyIntegrationPreservesStartupRulesAndEnablesLowerLevelsInCachedBootstrapRuntimeAndMicrosoftLoggers` |
| New overrides reach existing loggers | `NewOverrideAffectsAlreadyCreatedSerilogLogger`, `CachedMicrosoftLoggerUsesNewNamespaceOverride` |
| Removal restores parent/default inheritance | `RemovingChildOverrideRestoresParentAndParentChangesReachCachedChild`, `RemovingLastOverrideRestoresDefaultForCachedLogger` |
| Prefix boundaries and case matching | `NamespaceMatchesExactAndDottedChildrenButNotSimilarPrefix`, `NamespaceMatchingIsCaseInsensitiveAndDuplicateCaseVariantsAreRejected` |
| Reset restores startup rules | `ResetRestoresStartupDefaultAndOverridesForCachedLoggers` |
| Invalid changes remain atomic | `InvalidUpdateLeavesWholeConfigurationAndRevisionUnchanged`, `DuplicateNamespaceRejectsWholeUpdate`, `InvalidRevisionIsRejectedWithoutChangingState` |
| Concurrent updates and stale resets cannot overwrite changes | `ConcurrentUpdatesAtSameRevisionAllowExactlyOneWinner`, `StaleApplyAndResetCannotOverwriteAnotherUsersChange` |
| Scalar/default configuration precedence matches Serilog | `StartupMinimumUsesHighestProviderAcrossScalarAndObjectShapes`, `ScalarMinimumWinsOverObjectDefaultInSameProvider`, `ControlledByRemainsEffectiveWhenHigherProviderChangesMinimumShape` |
| API admin policy and error responses | `ControllerRequiresAdminAuthorizationAndHasNoAnonymousActions`, `UnconfiguredInstallationReturnsActionable503`, `InvalidUpdateReturns400AndPreservesRules`, `ValidUpdateReturnsCurrentStateAndStaleUpdateAndResetReturn409` |
| Native Overview follows runtime default and reset | `NativeOverviewReflectsEffectiveDefaultAfterApplyAndReset` |
| Stock repository lifetime and custom repositories are preserved | `ComposerReplacesStockRepositoryAndPreservesLifetime`, `ComposerPreservesCustomFactoryRepositoryRegistration`, `ComposerPreservesCustomRepositoryTypeAndLifetime`, `ComposerWithoutExplicitSetupRegistersStoreAndUpdatesStockRepository` |

Frontend: `npm test` passes 7 checks, including draft immutability, semantic comparison, namespace validation, HTTP status localization and complete catalogs for all eight languages with matching placeholders. `npm run build` passes TypeScript and Vite production compilation. The build excludes Umbraco's shared UI runtime and uses its existing modules.

Workflow syntax: actionlint 1.7.7, checksum verified against its official release manifest, passes for both workflows.

## Localization

All 56 UI keys are supplied for en, de, fr, nl, da, sv, it and es. The tab label, displayed levels, accessibility labels, notifications and validation use Umbraco localization. Stored status/error state contains keys so existing notices can update when the language changes. API level values remain canonical Serilog identifiers. The NuGet archive includes all eight language chunks.

The translations have not been proofread by native speakers. Browser checks covered English, Danish (da-DK), German (de-DE) and English fallback under Norwegian Bokm�l; the remaining five included cultures were checked through catalog/placeholder tests and build output.

## Real Umbraco browser check

Created a separate disposable Umbraco 17.0.0 host with SQLite and the project's library reference. Its local test credentials and database are outside this repository.

- Confirmed Danish/German tab headings, level labels, accessibility labels and notices in the installed NuGet package. Applied Information / xyz Debug using Danish display labels, checked duplicate-source validation in Danish, and restored startup levels through the German confirmation dialog. English fallback also loaded correctly for a Norwegian profile.
- Confirmed the administrator-only Log levels tab is inside Log Viewer, beside Overview/Search.
- Loaded baseline default Warning, Microsoft Warning, xyz Information.
- Changed default to Information and xyz to Debug, applied and observed active values update.
- Added MyProject.Services at Debug, applied and observed it as active.
- Removed that override and applied successfully.
- Reset to startup and observed default Warning / xyz Information again.
- Confirmed unauthenticated GET to the package API returns HTTP 401.
- Captured `docs/images/loglevels.png` from the running backoffice.
- Repeated loading and applying changes after switching the host from a project reference to the packed `Umbraco.Community.LogLevels.17.0.0.nupkg`, installed from a local feed.
- Reinstalled the automatic-composer package into a fresh local NuGet cache, removed AddLogLevels and its using directive from Program.cs, then loaded the tab and applied default Information / xyz Debug successfully.
- Confirmed the standard Overview card reports Warning at startup rather than the internal permissive Serilog level.

## Limits of verification

Both project-reference and installed-NuGet browser checks passed. NuGet identity, version/dependency range, readme/icon/notices, static manifest, JavaScript and assembly contents were also checked. Installing into an independently maintained production site remains a deployment check. No external repository, NuGet publication or GitHub Actions run was created.

NuGet emitted NU1900 because its vulnerability data endpoint was unreachable in the sandbox; compilation, tests and packing still completed. npm audit reported seven development dependency findings: one critical, two high, three moderate, one low. These include the frozen Umbraco 17 client/tooling dependency tree; the affected packages are not copied into the runtime browser bundle. The exact Umbraco 17.0.0 reference is retained as requested. Review build-tool advisories before release.

The runtime-filter architecture performs message construction/enrichment before filtering and leaves native IsEnabled permissive. No production-load benchmark or multi-node synchronization test was performed. Configured sink restrictions remain effective. Umbraco 18 is outside this release.

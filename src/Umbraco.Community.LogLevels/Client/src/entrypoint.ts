import type { UmbEntryPointOnInit } from "@umbraco-cms/backoffice/extension-api";
import type { ManifestWorkspaceView } from "@umbraco-cms/backoffice/workspace";
import { localizations } from "./localization/manifests.mjs";
const view: ManifestWorkspaceView = {
  type: "workspaceView",
  alias: "LogLevels.WorkspaceView",
  name: "LogLevels workspace view",
  element: () => import("./loglevels.element.js"),
  weight: 100,
  meta: {
    label: "#logLevels_title",
    pathname: "loglevels",
    icon: "icon-equalizer",
  },
  conditions: [
    { alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.LogViewer" },
    { alias: "Umb.Condition.CurrentUser.IsAdmin" },
  ],
};
export const onInit: UmbEntryPointOnInit = (_host, registry) => {
  registry.registerMany(localizations);
  registry.register(view);
};

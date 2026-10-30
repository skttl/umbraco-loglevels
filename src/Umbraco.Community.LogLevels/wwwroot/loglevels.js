const a = [
  {
    type: "localization",
    alias: "LogLevels.Localization.en",
    name: "LogLevels English",
    meta: { culture: "en" },
    js: () => import("./en-BsSiyRAm.js")
  },
  {
    type: "localization",
    alias: "LogLevels.Localization.de",
    name: "LogLevels German",
    meta: { culture: "de" },
    js: () => import("./de-C5kr7EPv.js")
  },
  {
    type: "localization",
    alias: "LogLevels.Localization.fr",
    name: "LogLevels French",
    meta: { culture: "fr" },
    js: () => import("./fr-D2vNnKIN.js")
  },
  {
    type: "localization",
    alias: "LogLevels.Localization.nl",
    name: "LogLevels Dutch",
    meta: { culture: "nl" },
    js: () => import("./nl-DofYVI7y.js")
  },
  {
    type: "localization",
    alias: "LogLevels.Localization.da",
    name: "LogLevels Danish",
    meta: { culture: "da" },
    js: () => import("./da-8hGi6hGD.js")
  },
  {
    type: "localization",
    alias: "LogLevels.Localization.sv",
    name: "LogLevels Swedish",
    meta: { culture: "sv" },
    js: () => import("./sv-DDDTGIFE.js")
  },
  {
    type: "localization",
    alias: "LogLevels.Localization.it",
    name: "LogLevels Italian",
    meta: { culture: "it" },
    js: () => import("./it-BoxBM44L.js")
  },
  {
    type: "localization",
    alias: "LogLevels.Localization.es",
    name: "LogLevels Spanish",
    meta: { culture: "es" },
    js: () => import("./es-BDIEBI4v.js")
  }
], o = {
  type: "workspaceView",
  alias: "LogLevels.WorkspaceView",
  name: "LogLevels workspace view",
  element: () => import("./loglevels.element-Dmh63405.js"),
  weight: 100,
  meta: {
    label: "#logLevels_title",
    pathname: "loglevels",
    icon: "icon-equalizer"
  },
  conditions: [
    { alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.LogViewer" },
    { alias: "Umb.Condition.CurrentUser.IsAdmin" }
  ]
}, l = (i, e) => {
  e.registerMany(a), e.register(o);
};
export {
  l as onInit
};

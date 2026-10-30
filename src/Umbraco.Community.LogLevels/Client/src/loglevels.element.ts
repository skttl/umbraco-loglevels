import {
  LitElement,
  html,
  css,
  customElement,
  state,
  nothing,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import { client } from "./api/client.gen.js";
import { getSettings, updateSettings, resetSettings } from "./api/sdk.gen.js";
import type { Policy, Settings } from "./api/types.gen.js";
import {
  levels,
  copyPolicy,
  samePolicy,
  validateSource,
  requestErrorKey,
} from "./policy.mjs";

@customElement("loglevels-workspace-view")
export default class LogLevelsElement extends UmbElementMixin(LitElement) {
  @state() private data?: Settings;
  @state() private draft?: Policy;
  @state() private busy = true;
  @state() private message = "";
  @state() private error = "";
  @state() private conflict = false;
  @state() private confirmReset = false;
  @state() private source = "";
  @state() private sourceError = "";
  private ready = false;
  private term(key: string, ...args: string[]) {
    return this.localize.term(`logLevels_${key}`, ...args);
  }
  constructor() {
    super();
    this.consumeContext(UMB_AUTH_CONTEXT, (auth) => {
      if (!auth || this.ready) return;
      this.ready = true;
      const config = auth.getOpenApiConfiguration();
      client.setConfig({
        baseUrl: config.base,
        credentials: config.credentials,
        auth: config.token,
      });
      void this.load();
    });
  }
  private get dirty() {
    return (
      !!this.data && !!this.draft && !samePolicy(this.data.current, this.draft)
    );
  }
  private async load() {
    await this.request(async () => getSettings(), "refreshed");
  }
  private async request(action: () => Promise<any>, message: string) {
    this.busy = true;
    this.error = "";
    this.message = "";
    try {
      const result = await action();
      if (result.error || !result.data) {
        this.conflict = result.response?.status === 409 || this.conflict;
        this.error = requestErrorKey(result.response?.status);
        return;
      }
      this.data = result.data;
      this.draft = copyPolicy(result.data.current);
      this.conflict = false;
      this.confirmReset = false;
      this.message = message;
    } catch {
      this.error = "errorNetwork";
    } finally {
      this.busy = false;
    }
  }
  private apply() {
    if (!this.draft || !this.data || !this.dirty || this.busy || this.conflict)
      return;
    void this.request(
      () =>
        updateSettings({
          body: { ...this.draft!, revision: this.data!.revision },
        }),
      "applied",
    );
  }
  private reset() {
    if (!this.data || this.busy || this.conflict) return;
    void this.request(
      () => resetSettings({ query: { revision: this.data!.revision } }),
      "restored",
    );
  }
  private setLevel(source: string | null, level: string) {
    if (!this.draft || !levels.includes(level)) return;
    this.draft =
      source === null
        ? { ...this.draft, defaultLevel: level as Policy["defaultLevel"] }
        : {
            ...this.draft,
            overrides: this.draft.overrides.map((row) =>
              row.source === source
                ? { ...row, level: level as Policy["defaultLevel"] }
                : row,
            ),
          };
    this.message = "";
    this.confirmReset = false;
  }
  private async addSource(event: Event) {
    event.preventDefault();
    if (!this.draft) return;
    this.sourceError = validateSource(this.source, this.draft.overrides);
    if (this.sourceError) return;
    const source = this.source.trim();
    this.draft = {
      ...this.draft,
      overrides: [
        ...this.draft.overrides,
        { source, level: this.draft.defaultLevel },
      ],
    };
    this.source = "";
    this.message = "";
    this.confirmReset = false;
    await this.updateComplete;
    this.shadowRoot?.querySelector<HTMLElement>(`[data-last-select]`)?.focus();
  }
  private removeOverride(source: string) {
    if (!this.draft) return;
    this.draft = {
      ...this.draft,
      overrides: this.draft.overrides.filter((row) => row.source !== source),
    };
    this.message = "";
    this.confirmReset = false;
    this.updateComplete.then(() =>
      this.shadowRoot?.querySelector<HTMLElement>("#new-source")?.focus(),
    );
  }
  private select(source: string | null, level: string, last = false) {
    return html`<uui-select
      label=${source === null
        ? this.term("defaultLevelLabel")
        : this.term("namespaceLevelLabel", source)}
      .options=${levels.map((value) => ({
        name: this.term(`level${value}`),
        value,
        selected: value === level,
      }))}
      ?disabled=${this.busy}
      ?data-last-select=${last}
      @change=${(e: Event) =>
        this.setLevel(source, String((e.target as HTMLSelectElement).value))}
    ></uui-select>`;
  }
  override render() {
    return html`<uui-box headline=${this.term("title")} aria-busy=${this.busy}>
      <p>${this.term("description")}</p>
      ${this.data
        ? html`<p class="muted">
            ${this.term("server", this.data.serverName)} · LogLevels 17.0.0
          </p>`
        : nothing}
      <div role="status" aria-live="polite">
        ${this.busy
          ? html`<uui-loader></uui-loader> ${this.data
                ? this.term("saving")
                : this.term("loading")}`
          : this.message
            ? this.term(this.message)
            : ""}
      </div>
      ${this.error
        ? html`<div class="notice error" role="alert">
            ${this.term(this.error)}
          </div>`
        : nothing}
      ${this.conflict
        ? html`<div class="notice">
            <p>${this.term("reloadWarning")}</p>
            <uui-button
              look="secondary"
              label=${this.term("discardReload")}
              @click=${this.load}
              ?disabled=${this.busy}
              >${this.term("discardReload")}</uui-button
            >
          </div>`
        : nothing}
      ${!this.data && !this.busy
        ? html`<uui-button
            look="secondary"
            label=${this.term("retry")}
            @click=${this.load}
            >${this.term("retry")}</uui-button
          >`
        : nothing}
      ${this.draft && this.data
        ? html`
            <div class="table-scroll">
              <table>
                <caption>
                  ${this.term("tableCaption")}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">${this.term("source")}</th>
                    <th scope="col">${this.term("activeNow")}</th>
                    <th scope="col">${this.term("newLevel")}</th>
                    <th scope="col">
                      <span class="visually-hidden"
                        >${this.term("actions")}</span
                      >
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">
                      ${this.term("default")}
                      <small>${this.term("defaultHint")}</small>
                    </th>
                    <td>
                      ${this.term(`level${this.data.current.defaultLevel}`)}
                    </td>
                    <td>${this.select(null, this.draft.defaultLevel)}</td>
                    <td></td>
                  </tr>
                  ${this.draft.overrides.map((row, index) => {
                    const currentLevel = this.data!.current.overrides.find(
                      (current) => current.source === row.source,
                    )?.level;
                    return html`<tr>
                      <th scope="row"><code>${row.source}</code></th>
                      <td>
                        ${currentLevel
                          ? this.term(`level${currentLevel}`)
                          : html`<span class="muted"
                              >${this.term("newOverride")}</span
                            >`}
                      </td>
                      <td>
                        ${this.select(
                          row.source,
                          row.level,
                          index === this.draft!.overrides.length - 1,
                        )}
                      </td>
                      <td>
                        <uui-button
                          label=${this.term("removeLabel", row.source)}
                          compact
                          @click=${() => this.removeOverride(row.source)}
                          ?disabled=${this.busy}
                          >${this.term("remove")}</uui-button
                        >
                      </td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>
            <p class="muted">${this.term("inheritanceHint")}</p>
            <form @submit=${this.addSource}>
              <label for="new-source">${this.term("addOverride")}</label>
              <div class="add-row">
                <uui-input
                  id="new-source"
                  label=${this.term("namespace")}
                  name="namespace"
                  placeholder=${this.term("namespacePlaceholder")}
                  .value=${this.source}
                  ?disabled=${this.busy}
                  @input=${(e: Event) => {
                    this.source = String((e.target as HTMLInputElement).value);
                    this.sourceError = "";
                  }}
                ></uui-input
                ><uui-button
                  type="submit"
                  look="secondary"
                  label=${this.term("addNamespace")}
                  ?disabled=${this.busy}
                  >${this.term("addNamespace")}</uui-button
                >
              </div>
              ${this.sourceError
                ? html`<p class="error-text" role="alert">
                    ${this.term(this.sourceError)}
                  </p>`
                : nothing}
            </form>
            ${[
              this.draft.defaultLevel,
              ...this.draft.overrides.map((row) => row.level),
            ].some((level) => level === "Debug" || level === "Verbose")
              ? html`<p class="notice">${this.term("detailedWarning")}</p>`
              : nothing}
            <footer>
              <span
                >${this.dirty
                  ? this.term("unapplied")
                  : this.term("noChanges")}</span
              >
              <div class="actions">
                <uui-button
                  label=${this.term("discardDraft")}
                  ?disabled=${this.busy || !this.dirty}
                  @click=${() => {
                    this.draft = copyPolicy(this.data!.current);
                    this.sourceError = "";
                    this.confirmReset = false;
                  }}
                  >${this.term("discardDraft")}</uui-button
                >
                <uui-button
                  label=${this.term("reset")}
                  look="secondary"
                  ?disabled=${this.busy || this.conflict}
                  @click=${() => (this.confirmReset = !this.confirmReset)}
                  >${this.term("reset")}</uui-button
                >
                <uui-button
                  label=${this.term("apply")}
                  look="primary"
                  color="positive"
                  ?disabled=${this.busy || !this.dirty || this.conflict}
                  @click=${this.apply}
                  >${this.term("apply")}</uui-button
                >
              </div>
            </footer>
            ${this.confirmReset
              ? html`<section
                  class="notice"
                  aria-label=${this.term("confirmReset")}
                >
                  <p>${this.term("resetWarning")}</p>
                  <div class="actions">
                    <uui-button
                      label=${this.term("restore")}
                      look="primary"
                      @click=${this.reset}
                      >${this.term("restore")}</uui-button
                    ><uui-button
                      label=${this.term("cancelReset")}
                      @click=${() => (this.confirmReset = false)}
                      >${this.term("cancel")}</uui-button
                    >
                  </div>
                </section>`
              : nothing}
          `
        : nothing}
    </uui-box>`;
  }
  static override styles = [
    UmbTextStyles,
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
        color: var(--uui-color-text);
      }
      uui-box {
        max-width: 1200px;
        margin: auto;
      }
      p {
        margin: 0 0 var(--uui-size-space-4);
      }
      .muted,
      small {
        color: var(--uui-color-text-alt);
      }
      .table-scroll {
        overflow-x: auto;
        margin-block: var(--uui-size-space-5);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        text-align: start;
      }
      caption {
        text-align: start;
        font-weight: 600;
        padding-block-end: var(--uui-size-space-4);
      }
      th,
      td {
        text-align: start;
        padding: var(--uui-size-space-4);
        border-bottom: 1px solid var(--uui-color-border);
        vertical-align: middle;
      }
      thead th {
        font-weight: 600;
        background: var(--uui-color-surface-alt);
      }
      tbody th {
        font-weight: 400;
        min-width: 180px;
      }
      small {
        display: block;
        margin-top: 4px;
      }
      code {
        overflow-wrap: anywhere;
      }
      uui-select {
        min-width: 155px;
        width: 100%;
      }
      form {
        margin-block: var(--uui-size-space-5);
      }
      label {
        display: block;
        font-weight: 600;
        margin-bottom: var(--uui-size-space-3);
      }
      .add-row,
      .actions {
        display: flex;
        gap: var(--uui-size-space-3);
        flex-wrap: wrap;
        align-items: center;
      }
      uui-input {
        flex: 1;
        min-width: 220px;
      }
      footer {
        display: flex;
        justify-content: space-between;
        gap: var(--uui-size-space-4);
        align-items: center;
        flex-wrap: wrap;
        border-top: 1px solid var(--uui-color-border);
        padding-top: var(--uui-size-space-5);
        margin-top: var(--uui-size-space-5);
      }
      .notice {
        background: var(--uui-color-surface-alt);
        border-inline-start: 3px solid var(--uui-color-warning);
        padding: var(--uui-size-space-4);
        margin-block: var(--uui-size-space-4);
      }
      .error {
        border-color: var(--uui-color-danger);
      }
      .error-text {
        color: var(--uui-color-danger);
      }
      [role="status"] {
        min-height: 24px;
      }
      uui-loader {
        vertical-align: middle;
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
      }
    `,
  ];
}

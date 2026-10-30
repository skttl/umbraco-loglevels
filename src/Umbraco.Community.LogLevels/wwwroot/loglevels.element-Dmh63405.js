import { LitElement as ee, html as m, nothing as z, css as te, state as S, customElement as re } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as se } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as ie } from "@umbraco-cms/backoffice/auth";
import { UmbTextStyles as ae } from "@umbraco-cms/backoffice/style";
const oe = {
  bodySerializer: (e) => JSON.stringify(
    e,
    (t, r) => typeof r == "bigint" ? r.toString() : r
  )
}, ne = ({
  onRequest: e,
  onSseError: t,
  onSseEvent: r,
  responseTransformer: s,
  responseValidator: i,
  sseDefaultRetryDelay: l,
  sseMaxRetryAttempts: n,
  sseMaxRetryDelay: o,
  sseSleepFn: c,
  url: d,
  ...a
}) => {
  let h;
  const C = c ?? ((u) => new Promise((p) => setTimeout(p, u)));
  return { stream: async function* () {
    let u = l ?? 3e3, p = 0;
    const k = a.signal ?? new AbortController().signal;
    for (; !k.aborted; ) {
      p++;
      const q = a.headers instanceof Headers ? a.headers : new Headers(a.headers);
      h !== void 0 && q.set("Last-Event-ID", h);
      try {
        const j = {
          redirect: "follow",
          ...a,
          body: a.serializedBody,
          headers: q,
          signal: k
        };
        let g = new Request(d, j);
        e && (g = await e(d, j));
        const b = await (a.fetch ?? globalThis.fetch)(g);
        if (!b.ok)
          throw new Error(
            `SSE failed: ${b.status} ${b.statusText}`
          );
        if (!b.body) throw new Error("No body in SSE response");
        const $ = b.body.pipeThrough(new TextDecoderStream()).getReader();
        let R = "";
        const I = () => {
          try {
            $.cancel();
          } catch {
          }
        };
        k.addEventListener("abort", I);
        try {
          for (; ; ) {
            const { done: K, value: X } = await $.read();
            if (K) break;
            R += X;
            const U = R.split(`

`);
            R = U.pop() ?? "";
            for (const Y of U) {
              const Z = Y.split(`
`), L = [];
              let P;
              for (const v of Z)
                if (v.startsWith("data:"))
                  L.push(v.replace(/^data:\s*/, ""));
                else if (v.startsWith("event:"))
                  P = v.replace(/^event:\s*/, "");
                else if (v.startsWith("id:"))
                  h = v.replace(/^id:\s*/, "");
                else if (v.startsWith("retry:")) {
                  const B = Number.parseInt(
                    v.replace(/^retry:\s*/, ""),
                    10
                  );
                  Number.isNaN(B) || (u = B);
                }
              let E, N = !1;
              if (L.length) {
                const v = L.join(`
`);
                try {
                  E = JSON.parse(v), N = !0;
                } catch {
                  E = v;
                }
              }
              N && (i && await i(E), s && (E = await s(E))), r == null || r({
                data: E,
                event: P,
                id: h,
                retry: u
              }), L.length && (yield E);
            }
          }
        } finally {
          k.removeEventListener("abort", I), $.releaseLock();
        }
        break;
      } catch (j) {
        if (t == null || t(j), n !== void 0 && p >= n)
          break;
        const g = Math.min(
          u * 2 ** (p - 1),
          o ?? 3e4
        );
        await C(g);
      }
    }
  }() };
}, ce = (e) => {
  switch (e) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, le = (e) => {
  switch (e) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
}, ue = (e) => {
  switch (e) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, F = ({
  allowReserved: e,
  explode: t,
  name: r,
  style: s,
  value: i
}) => {
  if (!t) {
    const o = (e ? i : i.map((c) => encodeURIComponent(c))).join(le(s));
    switch (s) {
      case "label":
        return `.${o}`;
      case "matrix":
        return `;${r}=${o}`;
      case "simple":
        return o;
      default:
        return `${r}=${o}`;
    }
  }
  const l = ce(s), n = i.map((o) => s === "label" || s === "simple" ? e ? o : encodeURIComponent(o) : T({
    allowReserved: e,
    name: r,
    value: o
  })).join(l);
  return s === "label" || s === "matrix" ? l + n : n;
}, T = ({
  allowReserved: e,
  name: t,
  value: r
}) => {
  if (r == null)
    return "";
  if (typeof r == "object")
    throw new Error(
      "Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these."
    );
  return `${t}=${e ? r : encodeURIComponent(r)}`;
}, J = ({
  allowReserved: e,
  explode: t,
  name: r,
  style: s,
  value: i,
  valueOnly: l
}) => {
  if (i instanceof Date)
    return l ? i.toISOString() : `${r}=${i.toISOString()}`;
  if (s !== "deepObject" && !t) {
    let c = [];
    Object.entries(i).forEach(([a, h]) => {
      c = [
        ...c,
        a,
        e ? h : encodeURIComponent(h)
      ];
    });
    const d = c.join(",");
    switch (s) {
      case "form":
        return `${r}=${d}`;
      case "label":
        return `.${d}`;
      case "matrix":
        return `;${r}=${d}`;
      default:
        return d;
    }
  }
  const n = ue(s), o = Object.entries(i).map(
    ([c, d]) => T({
      allowReserved: e,
      name: s === "deepObject" ? `${r}[${c}]` : c,
      value: d
    })
  ).join(n);
  return s === "label" || s === "matrix" ? n + o : o;
}, de = /\{[^{}]+\}/g, he = ({ path: e, url: t }) => {
  let r = t;
  const s = t.match(de);
  if (s)
    for (const i of s) {
      let l = !1, n = i.substring(1, i.length - 1), o = "simple";
      n.endsWith("*") && (l = !0, n = n.substring(0, n.length - 1)), n.startsWith(".") ? (n = n.substring(1), o = "label") : n.startsWith(";") && (n = n.substring(1), o = "matrix");
      const c = e[n];
      if (c == null)
        continue;
      if (Array.isArray(c)) {
        r = r.replace(
          i,
          F({ explode: l, name: n, style: o, value: c })
        );
        continue;
      }
      if (typeof c == "object") {
        r = r.replace(
          i,
          J({
            explode: l,
            name: n,
            style: o,
            value: c,
            valueOnly: !0
          })
        );
        continue;
      }
      if (o === "matrix") {
        r = r.replace(
          i,
          `;${T({
            name: n,
            value: c
          })}`
        );
        continue;
      }
      const d = encodeURIComponent(
        o === "label" ? `.${c}` : c
      );
      r = r.replace(i, d);
    }
  return r;
}, fe = ({
  baseUrl: e,
  path: t,
  query: r,
  querySerializer: s,
  url: i
}) => {
  const l = i.startsWith("/") ? i : `/${i}`;
  let n = (e ?? "") + l;
  t && (n = he({ path: t, url: n }));
  let o = r ? s(r) : "";
  return o.startsWith("?") && (o = o.substring(1)), o && (n += `?${o}`), n;
};
function pe(e) {
  const t = e.body !== void 0;
  if (t && e.bodySerializer)
    return "serializedBody" in e ? e.serializedBody !== void 0 && e.serializedBody !== "" ? e.serializedBody : null : e.body !== "" ? e.body : null;
  if (t)
    return e.body;
}
const me = async (e, t) => {
  const r = typeof t == "function" ? await t(e) : t;
  if (r)
    return e.scheme === "bearer" ? `Bearer ${r}` : e.scheme === "basic" ? `Basic ${btoa(r)}` : r;
}, M = ({
  allowReserved: e,
  array: t,
  object: r
} = {}) => (i) => {
  const l = [];
  if (i && typeof i == "object")
    for (const n in i) {
      const o = i[n];
      if (o != null)
        if (Array.isArray(o)) {
          const c = F({
            allowReserved: e,
            explode: !0,
            name: n,
            style: "form",
            value: o,
            ...t
          });
          c && l.push(c);
        } else if (typeof o == "object") {
          const c = J({
            allowReserved: e,
            explode: !0,
            name: n,
            style: "deepObject",
            value: o,
            ...r
          });
          c && l.push(c);
        } else {
          const c = T({
            allowReserved: e,
            name: n,
            value: o
          });
          c && l.push(c);
        }
    }
  return l.join("&");
}, be = (e) => {
  var r;
  if (!e)
    return "stream";
  const t = (r = e.split(";")[0]) == null ? void 0 : r.trim();
  if (t) {
    if (t.startsWith("application/json") || t.endsWith("+json"))
      return "json";
    if (t === "multipart/form-data")
      return "formData";
    if (["application/", "audio/", "image/", "video/"].some(
      (s) => t.startsWith(s)
    ))
      return "blob";
    if (t.startsWith("text/"))
      return "text";
  }
}, ye = (e, t) => {
  var r, s;
  return t ? !!(e.headers.has(t) || (r = e.query) != null && r[t] || (s = e.headers.get("Cookie")) != null && s.includes(`${t}=`)) : !1;
}, ve = async ({
  security: e,
  ...t
}) => {
  for (const r of e) {
    if (ye(t, r.name))
      continue;
    const s = await me(r, t.auth);
    if (!s)
      continue;
    const i = r.name ?? "Authorization";
    switch (r.in) {
      case "query":
        t.query || (t.query = {}), t.query[i] = s;
        break;
      case "cookie":
        t.headers.append("Cookie", `${i}=${s}`);
        break;
      case "header":
      default:
        t.headers.set(i, s);
        break;
    }
  }
}, W = (e) => fe({
  baseUrl: e.baseUrl,
  path: e.path,
  query: e.query,
  querySerializer: typeof e.querySerializer == "function" ? e.querySerializer : M(e.querySerializer),
  url: e.url
}), H = (e, t) => {
  var s;
  const r = { ...e, ...t };
  return (s = r.baseUrl) != null && s.endsWith("/") && (r.baseUrl = r.baseUrl.substring(0, r.baseUrl.length - 1)), r.headers = G(e.headers, t.headers), r;
}, ge = (e) => {
  const t = [];
  return e.forEach((r, s) => {
    t.push([s, r]);
  }), t;
}, G = (...e) => {
  const t = new Headers();
  for (const r of e) {
    if (!r)
      continue;
    const s = r instanceof Headers ? ge(r) : Object.entries(r);
    for (const [i, l] of s)
      if (l === null)
        t.delete(i);
      else if (Array.isArray(l))
        for (const n of l)
          t.append(i, n);
      else l !== void 0 && t.set(
        i,
        typeof l == "object" ? JSON.stringify(l) : l
      );
  }
  return t;
};
class D {
  constructor() {
    this.fns = [];
  }
  clear() {
    this.fns = [];
  }
  eject(t) {
    const r = this.getInterceptorIndex(t);
    this.fns[r] && (this.fns[r] = null);
  }
  exists(t) {
    const r = this.getInterceptorIndex(t);
    return !!this.fns[r];
  }
  getInterceptorIndex(t) {
    return typeof t == "number" ? this.fns[t] ? t : -1 : this.fns.indexOf(t);
  }
  update(t, r) {
    const s = this.getInterceptorIndex(t);
    return this.fns[s] ? (this.fns[s] = r, t) : !1;
  }
  use(t) {
    return this.fns.push(t), this.fns.length - 1;
  }
}
const $e = () => ({
  error: new D(),
  request: new D(),
  response: new D()
}), we = M({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), xe = {
  "Content-Type": "application/json"
}, Q = (e = {}) => ({
  ...oe,
  headers: xe,
  parseAs: "auto",
  querySerializer: we,
  ...e
}), Se = (e = {}) => {
  let t = H(Q(), e);
  const r = () => ({ ...t }), s = (d) => (t = H(t, d), r()), i = $e(), l = async (d) => {
    const a = {
      ...t,
      ...d,
      fetch: d.fetch ?? t.fetch ?? globalThis.fetch,
      headers: G(t.headers, d.headers),
      serializedBody: void 0
    };
    a.security && await ve({
      ...a,
      security: a.security
    }), a.requestValidator && await a.requestValidator(a), a.body !== void 0 && a.bodySerializer && (a.serializedBody = a.bodySerializer(a.body)), (a.body === void 0 || a.serializedBody === "") && a.headers.delete("Content-Type");
    const h = W(a);
    return { opts: a, url: h };
  }, n = async (d) => {
    const { opts: a, url: h } = await l(d), C = {
      redirect: "follow",
      ...a,
      body: pe(a)
    };
    let x = new Request(h, C);
    for (const f of i.request.fns)
      f && (x = await f(x, a));
    const O = a.fetch;
    let u = await O(x);
    for (const f of i.response.fns)
      f && (u = await f(u, x, a));
    const p = {
      request: x,
      response: u
    };
    if (u.ok) {
      const f = (a.parseAs === "auto" ? be(u.headers.get("Content-Type")) : a.parseAs) ?? "json";
      if (u.status === 204 || u.headers.get("Content-Length") === "0") {
        let $;
        switch (f) {
          case "arrayBuffer":
          case "blob":
          case "text":
            $ = await u[f]();
            break;
          case "formData":
            $ = new FormData();
            break;
          case "stream":
            $ = u.body;
            break;
          case "json":
          default:
            $ = {};
            break;
        }
        return a.responseStyle === "data" ? $ : {
          data: $,
          ...p
        };
      }
      let b;
      switch (f) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          b = await u[f]();
          break;
        case "stream":
          return a.responseStyle === "data" ? u.body : {
            data: u.body,
            ...p
          };
      }
      return f === "json" && (a.responseValidator && await a.responseValidator(b), a.responseTransformer && (b = await a.responseTransformer(b))), a.responseStyle === "data" ? b : {
        data: b,
        ...p
      };
    }
    const k = await u.text();
    let q;
    try {
      q = JSON.parse(k);
    } catch {
    }
    const j = q ?? k;
    let g = j;
    for (const f of i.error.fns)
      f && (g = await f(j, u, x, a));
    if (g = g || {}, a.throwOnError)
      throw g;
    return a.responseStyle === "data" ? void 0 : {
      error: g,
      ...p
    };
  }, o = (d) => (a) => n({ ...a, method: d }), c = (d) => async (a) => {
    const { opts: h, url: C } = await l(a);
    return ne({
      ...h,
      body: h.body,
      headers: h.headers,
      method: d,
      onRequest: async (x, O) => {
        let u = new Request(x, O);
        for (const p of i.request.fns)
          p && (u = await p(u, h));
        return u;
      },
      url: C
    });
  };
  return {
    buildUrl: W,
    connect: o("CONNECT"),
    delete: o("DELETE"),
    get: o("GET"),
    getConfig: r,
    head: o("HEAD"),
    interceptors: i,
    options: o("OPTIONS"),
    patch: o("PATCH"),
    post: o("POST"),
    put: o("PUT"),
    request: n,
    setConfig: s,
    sse: {
      connect: c("CONNECT"),
      delete: c("DELETE"),
      get: c("GET"),
      head: c("HEAD"),
      options: c("OPTIONS"),
      patch: c("PATCH"),
      post: c("POST"),
      put: c("PUT"),
      trace: c("TRACE")
    },
    trace: o("TRACE")
  };
}, A = Se(Q()), ze = (e) => (e.client ?? A).delete({
  security: [
    {
      scheme: "bearer",
      type: "http"
    }
  ],
  url: "/umbraco/loglevels/api/v1/settings",
  ...e
}), ke = (e) => ((e == null ? void 0 : e.client) ?? A).get({
  security: [
    {
      scheme: "bearer",
      type: "http"
    }
  ],
  url: "/umbraco/loglevels/api/v1/settings",
  ...e
}), je = (e) => (e.client ?? A).put({
  security: [
    {
      scheme: "bearer",
      type: "http"
    }
  ],
  url: "/umbraco/loglevels/api/v1/settings",
  ...e,
  headers: {
    "Content-Type": "application/json",
    ...e.headers
  }
}), _ = [
  "Verbose",
  "Debug",
  "Information",
  "Warning",
  "Error",
  "Fatal"
], V = (e) => ({
  defaultLevel: e.defaultLevel,
  overrides: e.overrides.map((t) => ({ ...t }))
}), Ee = (e, t) => e.defaultLevel === t.defaultLevel && e.overrides.length === t.overrides.length && e.overrides.every(
  (r) => t.overrides.some(
    (s) => r.source === s.source && r.level === s.level
  )
), Ce = (e, t) => {
  const r = e.trim();
  return r ? /\s/.test(r) ? "sourceWhitespace" : r.startsWith(".") || r.endsWith(".") || r.includes("..") ? "sourceSegments" : t.some((s) => s.source.toUpperCase() === r.toUpperCase()) ? "sourceDuplicate" : "" : "sourceRequired";
}, qe = (e) => e === 409 ? "errorConflict" : e === 401 ? "errorUnauthorized" : e === 403 ? "errorForbidden" : e === 503 ? "errorUnavailable" : e === 400 ? "errorValidation" : "errorServer";
var Oe = Object.defineProperty, Le = Object.getOwnPropertyDescriptor, w = (e, t, r, s) => {
  for (var i = s > 1 ? void 0 : s ? Le(t, r) : t, l = e.length - 1, n; l >= 0; l--)
    (n = e[l]) && (i = (s ? n(t, r, i) : n(i)) || i);
  return s && i && Oe(t, r, i), i;
};
let y = class extends se(ee) {
  constructor() {
    super(), this.busy = !0, this.message = "", this.error = "", this.conflict = !1, this.confirmReset = !1, this.source = "", this.sourceError = "", this.ready = !1, this.consumeContext(ie, (e) => {
      if (!e || this.ready) return;
      this.ready = !0;
      const t = e.getOpenApiConfiguration();
      A.setConfig({
        baseUrl: t.base,
        credentials: t.credentials,
        auth: t.token
      }), this.load();
    });
  }
  term(e, ...t) {
    return this.localize.term(`logLevels_${e}`, ...t);
  }
  get dirty() {
    return !!this.data && !!this.draft && !Ee(this.data.current, this.draft);
  }
  async load() {
    await this.request(async () => ke(), "refreshed");
  }
  async request(e, t) {
    var r, s;
    this.busy = !0, this.error = "", this.message = "";
    try {
      const i = await e();
      if (i.error || !i.data) {
        this.conflict = ((r = i.response) == null ? void 0 : r.status) === 409 || this.conflict, this.error = qe((s = i.response) == null ? void 0 : s.status);
        return;
      }
      this.data = i.data, this.draft = V(i.data.current), this.conflict = !1, this.confirmReset = !1, this.message = t;
    } catch {
      this.error = "errorNetwork";
    } finally {
      this.busy = !1;
    }
  }
  apply() {
    !this.draft || !this.data || !this.dirty || this.busy || this.conflict || this.request(
      () => je({
        body: { ...this.draft, revision: this.data.revision }
      }),
      "applied"
    );
  }
  reset() {
    !this.data || this.busy || this.conflict || this.request(
      () => ze({ query: { revision: this.data.revision } }),
      "restored"
    );
  }
  setLevel(e, t) {
    !this.draft || !_.includes(t) || (this.draft = e === null ? { ...this.draft, defaultLevel: t } : {
      ...this.draft,
      overrides: this.draft.overrides.map(
        (r) => r.source === e ? { ...r, level: t } : r
      )
    }, this.message = "", this.confirmReset = !1);
  }
  async addSource(e) {
    var r, s;
    if (e.preventDefault(), !this.draft || (this.sourceError = Ce(this.source, this.draft.overrides), this.sourceError)) return;
    const t = this.source.trim();
    this.draft = {
      ...this.draft,
      overrides: [
        ...this.draft.overrides,
        { source: t, level: this.draft.defaultLevel }
      ]
    }, this.source = "", this.message = "", this.confirmReset = !1, await this.updateComplete, (s = (r = this.shadowRoot) == null ? void 0 : r.querySelector("[data-last-select]")) == null || s.focus();
  }
  removeOverride(e) {
    this.draft && (this.draft = {
      ...this.draft,
      overrides: this.draft.overrides.filter((t) => t.source !== e)
    }, this.message = "", this.confirmReset = !1, this.updateComplete.then(
      () => {
        var t, r;
        return (r = (t = this.shadowRoot) == null ? void 0 : t.querySelector("#new-source")) == null ? void 0 : r.focus();
      }
    ));
  }
  select(e, t, r = !1) {
    return m`<uui-select
      label=${e === null ? this.term("defaultLevelLabel") : this.term("namespaceLevelLabel", e)}
      .options=${_.map((s) => ({
      name: this.term(`level${s}`),
      value: s,
      selected: s === t
    }))}
      ?disabled=${this.busy}
      ?data-last-select=${r}
      @change=${(s) => this.setLevel(e, String(s.target.value))}
    ></uui-select>`;
  }
  render() {
    return m`<uui-box headline=${this.term("title")} aria-busy=${this.busy}>
      <p>${this.term("description")}</p>
      ${this.data ? m`<p class="muted">
            ${this.term("server", this.data.serverName)} · LogLevels 17.0.0
          </p>` : z}
      <div role="status" aria-live="polite">
        ${this.busy ? m`<uui-loader></uui-loader> ${this.data ? this.term("saving") : this.term("loading")}` : this.message ? this.term(this.message) : ""}
      </div>
      ${this.error ? m`<div class="notice error" role="alert">
            ${this.term(this.error)}
          </div>` : z}
      ${this.conflict ? m`<div class="notice">
            <p>${this.term("reloadWarning")}</p>
            <uui-button
              look="secondary"
              label=${this.term("discardReload")}
              @click=${this.load}
              ?disabled=${this.busy}
              >${this.term("discardReload")}</uui-button
            >
          </div>` : z}
      ${!this.data && !this.busy ? m`<uui-button
            look="secondary"
            label=${this.term("retry")}
            @click=${this.load}
            >${this.term("retry")}</uui-button
          >` : z}
      ${this.draft && this.data ? m`
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
                  ${this.draft.overrides.map((e, t) => {
      var s;
      const r = (s = this.data.current.overrides.find(
        (i) => i.source === e.source
      )) == null ? void 0 : s.level;
      return m`<tr>
                      <th scope="row"><code>${e.source}</code></th>
                      <td>
                        ${r ? this.term(`level${r}`) : m`<span class="muted"
                              >${this.term("newOverride")}</span
                            >`}
                      </td>
                      <td>
                        ${this.select(
        e.source,
        e.level,
        t === this.draft.overrides.length - 1
      )}
                      </td>
                      <td>
                        <uui-button
                          label=${this.term("removeLabel", e.source)}
                          compact
                          @click=${() => this.removeOverride(e.source)}
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
                  @input=${(e) => {
      this.source = String(e.target.value), this.sourceError = "";
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
              ${this.sourceError ? m`<p class="error-text" role="alert">
                    ${this.term(this.sourceError)}
                  </p>` : z}
            </form>
            ${[
      this.draft.defaultLevel,
      ...this.draft.overrides.map((e) => e.level)
    ].some((e) => e === "Debug" || e === "Verbose") ? m`<p class="notice">${this.term("detailedWarning")}</p>` : z}
            <footer>
              <span
                >${this.dirty ? this.term("unapplied") : this.term("noChanges")}</span
              >
              <div class="actions">
                <uui-button
                  label=${this.term("discardDraft")}
                  ?disabled=${this.busy || !this.dirty}
                  @click=${() => {
      this.draft = V(this.data.current), this.sourceError = "", this.confirmReset = !1;
    }}
                  >${this.term("discardDraft")}</uui-button
                >
                <uui-button
                  label=${this.term("reset")}
                  look="secondary"
                  ?disabled=${this.busy || this.conflict}
                  @click=${() => this.confirmReset = !this.confirmReset}
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
            ${this.confirmReset ? m`<section
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
                      @click=${() => this.confirmReset = !1}
                      >${this.term("cancel")}</uui-button
                    >
                  </div>
                </section>` : z}
          ` : z}
    </uui-box>`;
  }
};
y.styles = [
  ae,
  te`
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
    `
];
w([
  S()
], y.prototype, "data", 2);
w([
  S()
], y.prototype, "draft", 2);
w([
  S()
], y.prototype, "busy", 2);
w([
  S()
], y.prototype, "message", 2);
w([
  S()
], y.prototype, "error", 2);
w([
  S()
], y.prototype, "conflict", 2);
w([
  S()
], y.prototype, "confirmReset", 2);
w([
  S()
], y.prototype, "source", 2);
w([
  S()
], y.prototype, "sourceError", 2);
y = w([
  re("loglevels-workspace-view")
], y);
export {
  y as default
};

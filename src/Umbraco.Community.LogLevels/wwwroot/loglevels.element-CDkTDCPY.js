import { LitElement as te, html as y, nothing as j, css as re, state as k, customElement as se } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as ie } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT as ae } from "@umbraco-cms/backoffice/auth";
import { UmbTextStyles as oe } from "@umbraco-cms/backoffice/style";
const ne = {
  bodySerializer: (e) => JSON.stringify(e, (t, r) => typeof r == "bigint" ? r.toString() : r)
};
function le({
  onRequest: e,
  onSseError: t,
  onSseEvent: r,
  responseTransformer: s,
  responseValidator: i,
  sseDefaultRetryDelay: l,
  sseMaxRetryAttempts: a,
  sseMaxRetryDelay: o,
  sseSleepFn: n,
  url: v,
  ...u
}) {
  let c;
  const w = n ?? ((d) => new Promise((f) => setTimeout(f, d)));
  return { stream: async function* () {
    let d = l ?? 3e3, f = 0;
    const g = u.signal ?? new AbortController().signal;
    for (; !g.aborted; ) {
      f++;
      const q = u.headers instanceof Headers ? u.headers : new Headers(u.headers);
      c !== void 0 && q.set("Last-Event-ID", c);
      try {
        const E = {
          redirect: "follow",
          ...u,
          body: u.serializedBody,
          headers: q,
          signal: g
        };
        let O = new Request(v, E);
        e && (O = await e(v, E));
        const p = await (u.fetch ?? globalThis.fetch)(O);
        if (!p.ok) throw new Error(`SSE failed: ${p.status} ${p.statusText}`);
        if (!p.body) throw new Error("No body in SSE response");
        const x = p.body.pipeThrough(new TextDecoderStream()).getReader();
        let m = "";
        const D = () => {
          try {
            x.cancel();
          } catch {
          }
        };
        g.addEventListener("abort", D);
        try {
          for (; ; ) {
            const { done: X, value: Y } = await x.read();
            if (X) break;
            m += Y, m = m.replace(/\r\n?/g, `
`);
            const I = m.split(`

`);
            m = I.pop() ?? "";
            for (const Z of I) {
              const ee = Z.split(`
`), R = [];
              let N;
              for (const S of ee)
                if (S.startsWith("data:"))
                  R.push(S.replace(/^data:\s*/, ""));
                else if (S.startsWith("event:"))
                  N = S.replace(/^event:\s*/, "");
                else if (S.startsWith("id:"))
                  c = S.replace(/^id:\s*/, "");
                else if (S.startsWith("retry:")) {
                  const B = Number.parseInt(S.replace(/^retry:\s*/, ""), 10);
                  Number.isNaN(B) || (d = B);
                }
              let C, P = !1;
              if (R.length) {
                const S = R.join(`
`);
                try {
                  C = JSON.parse(S), P = !0;
                } catch {
                  C = S;
                }
              }
              P && (i && await i(C), s && (C = await s(C))), r == null || r({
                data: C,
                event: N,
                id: c,
                retry: d
              }), R.length && (yield C);
            }
          }
        } finally {
          g.removeEventListener("abort", D), x.releaseLock();
        }
        break;
      } catch (E) {
        if (t == null || t(E), a !== void 0 && f >= a)
          break;
        const O = Math.min(d * 2 ** (f - 1), o ?? 3e4);
        await w(O);
      }
    }
  }() };
}
const ce = (e) => {
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
}, ue = (e) => {
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
}, de = (e) => {
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
}, J = ({
  allowReserved: e,
  explode: t,
  name: r,
  style: s,
  value: i
}) => {
  if (!t) {
    const o = (e ? i : i.map((n) => encodeURIComponent(n))).join(ue(s));
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
  const l = ce(s), a = i.map((o) => s === "label" || s === "simple" ? e ? o : encodeURIComponent(o) : L({
    allowReserved: e,
    name: r,
    value: o
  })).join(l);
  return s === "label" || s === "matrix" ? l + a : a;
}, L = ({
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
}, M = ({
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
    let n = [];
    Object.entries(i).forEach(([u, c]) => {
      n = [...n, u, e ? c : encodeURIComponent(c)];
    });
    const v = n.join(",");
    switch (s) {
      case "form":
        return `${r}=${v}`;
      case "label":
        return `.${v}`;
      case "matrix":
        return `;${r}=${v}`;
      default:
        return v;
    }
  }
  const a = de(s), o = Object.entries(i).map(
    ([n, v]) => L({
      allowReserved: e,
      name: s === "deepObject" ? `${r}[${n}]` : n,
      value: v
    })
  ).join(a);
  return s === "label" || s === "matrix" ? a + o : o;
}, he = /\{[^{}]+\}/g, fe = ({ path: e, url: t }) => {
  let r = t;
  const s = t.match(he);
  if (s)
    for (const i of s) {
      let l = !1, a = i.substring(1, i.length - 1), o = "simple";
      a.endsWith("*") && (l = !0, a = a.substring(0, a.length - 1)), a.startsWith(".") ? (a = a.substring(1), o = "label") : a.startsWith(";") && (a = a.substring(1), o = "matrix");
      const n = e[a];
      if (n == null)
        continue;
      if (Array.isArray(n)) {
        r = r.replace(i, J({ explode: l, name: a, style: o, value: n }));
        continue;
      }
      if (typeof n == "object") {
        r = r.replace(
          i,
          M({
            explode: l,
            name: a,
            style: o,
            value: n,
            valueOnly: !0
          })
        );
        continue;
      }
      if (o === "matrix") {
        r = r.replace(
          i,
          `;${L({
            name: a,
            value: n
          })}`
        );
        continue;
      }
      const v = encodeURIComponent(
        o === "label" ? `.${n}` : n
      );
      r = r.replace(i, v);
    }
  return r;
}, pe = ({
  baseUrl: e,
  path: t,
  query: r,
  querySerializer: s,
  url: i
}) => {
  const l = i.startsWith("/") ? i : `/${i}`;
  let a = (e ?? "") + l;
  t && (a = fe({ path: t, url: a }));
  let o = r ? s(r) : "";
  return o.startsWith("?") && (o = o.substring(1)), o && (a += `?${o}`), a;
};
function W(e) {
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
}, G = ({
  parameters: e = {},
  ...t
} = {}) => (s) => {
  const i = [];
  if (s && typeof s == "object")
    for (const l in s) {
      const a = s[l];
      if (a == null)
        continue;
      const o = e[l] || t;
      if (Array.isArray(a)) {
        const n = J({
          allowReserved: o.allowReserved,
          explode: !0,
          name: l,
          style: "form",
          value: a,
          ...o.array
        });
        n && i.push(n);
      } else if (typeof a == "object") {
        const n = M({
          allowReserved: o.allowReserved,
          explode: !0,
          name: l,
          style: "deepObject",
          value: a,
          ...o.object
        });
        n && i.push(n);
      } else {
        const n = L({
          allowReserved: o.allowReserved,
          name: l,
          value: a
        });
        n && i.push(n);
      }
    }
  return i.join("&");
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
    if (["application/", "audio/", "image/", "video/"].some((s) => t.startsWith(s)))
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
}, H = (e) => pe({
  baseUrl: e.baseUrl,
  path: e.path,
  query: e.query,
  querySerializer: typeof e.querySerializer == "function" ? e.querySerializer : G(e.querySerializer),
  url: e.url
}), _ = (e, t) => {
  var s;
  const r = { ...e, ...t };
  return (s = r.baseUrl) != null && s.endsWith("/") && (r.baseUrl = r.baseUrl.substring(0, r.baseUrl.length - 1)), r.headers = Q(e.headers, t.headers), r;
}, ge = (e) => {
  const t = [];
  return e.forEach((r, s) => {
    t.push([s, r]);
  }), t;
}, Q = (...e) => {
  const t = new Headers();
  for (const r of e) {
    if (!r)
      continue;
    const s = r instanceof Headers ? ge(r) : Object.entries(r);
    for (const [i, l] of s)
      if (l === null)
        t.delete(i);
      else if (Array.isArray(l))
        for (const a of l)
          t.append(i, a);
      else l !== void 0 && t.set(
        i,
        typeof l == "object" ? JSON.stringify(l) : l
      );
  }
  return t;
};
class U {
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
  error: new U(),
  request: new U(),
  response: new U()
}), we = G({
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
}, K = (e = {}) => ({
  ...ne,
  headers: xe,
  parseAs: "auto",
  querySerializer: we,
  ...e
}), Se = (e = {}) => {
  let t = _(K(), e);
  const r = () => ({ ...t }), s = (u) => (t = _(t, u), r()), i = $e(), l = async (u) => {
    const c = {
      ...t,
      ...u,
      fetch: u.fetch ?? t.fetch ?? globalThis.fetch,
      headers: Q(t.headers, u.headers),
      serializedBody: void 0
    };
    c.security && await ve({
      ...c,
      security: c.security
    }), c.requestValidator && await c.requestValidator(c), c.body !== void 0 && c.bodySerializer && (c.serializedBody = c.bodySerializer(c.body)), (c.body === void 0 || c.serializedBody === "") && c.headers.delete("Content-Type");
    const w = c, b = H(w);
    return { opts: w, url: b };
  }, a = async (u) => {
    const c = u.throwOnError ?? t.throwOnError, w = u.responseStyle ?? t.responseStyle;
    let b, h;
    try {
      const { opts: d, url: f } = await l(u), g = {
        redirect: "follow",
        ...d,
        body: W(d)
      };
      b = new Request(f, g);
      for (const p of i.request.fns)
        p && (b = await p(b, d));
      const q = d.fetch;
      h = await q(b);
      for (const p of i.response.fns)
        p && (h = await p(h, b, d));
      const E = {
        request: b,
        response: h
      };
      if (h.ok) {
        const p = (d.parseAs === "auto" ? be(h.headers.get("Content-Type")) : d.parseAs) ?? "json";
        if (h.status === 204 || h.headers.get("Content-Length") === "0") {
          let m;
          switch (p) {
            case "arrayBuffer":
            case "blob":
            case "text":
              m = await h[p]();
              break;
            case "formData":
              m = new FormData();
              break;
            case "stream":
              m = h.body;
              break;
            case "json":
            default:
              m = {};
              break;
          }
          return d.responseStyle === "data" ? m : {
            data: m,
            ...E
          };
        }
        let x;
        switch (p) {
          case "arrayBuffer":
          case "blob":
          case "formData":
          case "text":
            x = await h[p]();
            break;
          case "json": {
            const m = await h.text();
            x = m ? JSON.parse(m) : {};
            break;
          }
          case "stream":
            return d.responseStyle === "data" ? h.body : {
              data: h.body,
              ...E
            };
        }
        return p === "json" && (d.responseValidator && await d.responseValidator(x), d.responseTransformer && (x = await d.responseTransformer(x))), d.responseStyle === "data" ? x : {
          data: x,
          ...E
        };
      }
      const O = await h.text();
      let A;
      try {
        A = JSON.parse(O);
      } catch {
      }
      throw A ?? O;
    } catch (d) {
      let f = d;
      for (const g of i.error.fns)
        g && (f = await g(f, h, b, u));
      if (f = f || {}, c)
        throw f;
      return w === "data" ? void 0 : {
        error: f,
        request: b,
        response: h
      };
    }
  }, o = (u) => (c) => a({ ...c, method: u }), n = (u) => async (c) => {
    const { opts: w, url: b } = await l(c);
    return le({
      ...w,
      body: w.body,
      method: u,
      onRequest: async (h, d) => {
        let f = new Request(h, d);
        for (const g of i.request.fns)
          g && (f = await g(f, w));
        return f;
      },
      serializedBody: W(w),
      url: b
    });
  };
  return {
    buildUrl: (u) => H({ ...t, ...u }),
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
    request: a,
    setConfig: s,
    sse: {
      connect: n("CONNECT"),
      delete: n("DELETE"),
      get: n("GET"),
      head: n("HEAD"),
      options: n("OPTIONS"),
      patch: n("PATCH"),
      post: n("POST"),
      put: n("PUT"),
      trace: n("TRACE")
    },
    trace: o("TRACE")
  };
}, T = Se(K()), ze = (e) => (e.client ?? T).delete({
  security: [{ scheme: "bearer", type: "http" }],
  url: "/umbraco/loglevels/api/v1/settings",
  ...e
}), ke = (e) => ((e == null ? void 0 : e.client) ?? T).get({
  security: [{ scheme: "bearer", type: "http" }],
  url: "/umbraco/loglevels/api/v1/settings",
  ...e
}), Ee = (e) => (e.client ?? T).put({
  security: [{ scheme: "bearer", type: "http" }],
  url: "/umbraco/loglevels/api/v1/settings",
  ...e,
  headers: {
    "Content-Type": "application/json",
    ...e.headers
  }
}), V = [
  "Verbose",
  "Debug",
  "Information",
  "Warning",
  "Error",
  "Fatal"
], F = (e) => ({
  defaultLevel: e.defaultLevel,
  overrides: e.overrides.map((t) => ({ ...t }))
}), je = (e, t) => e.defaultLevel === t.defaultLevel && e.overrides.length === t.overrides.length && e.overrides.every(
  (r) => t.overrides.some(
    (s) => r.source === s.source && r.level === s.level
  )
), Oe = (e, t) => {
  const r = e.trim();
  return r ? /\s/.test(r) ? "sourceWhitespace" : r.startsWith(".") || r.endsWith(".") || r.includes("..") ? "sourceSegments" : t.some((s) => s.source.toUpperCase() === r.toUpperCase()) ? "sourceDuplicate" : "" : "sourceRequired";
}, Ce = (e) => e === 409 ? "errorConflict" : e === 401 ? "errorUnauthorized" : e === 403 ? "errorForbidden" : e === 503 ? "errorUnavailable" : e === 400 ? "errorValidation" : "errorServer";
var qe = Object.defineProperty, Re = Object.getOwnPropertyDescriptor, z = (e, t, r, s) => {
  for (var i = s > 1 ? void 0 : s ? Re(t, r) : t, l = e.length - 1, a; l >= 0; l--)
    (a = e[l]) && (i = (s ? a(t, r, i) : a(i)) || i);
  return s && i && qe(t, r, i), i;
};
let $ = class extends ie(te) {
  constructor() {
    super(), this.busy = !0, this.message = "", this.error = "", this.conflict = !1, this.confirmReset = !1, this.source = "", this.sourceError = "", this.ready = !1, this.consumeContext(ae, (e) => {
      if (!e || this.ready) return;
      this.ready = !0;
      const t = e.getOpenApiConfiguration();
      T.setConfig({
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
    return !!this.data && !!this.draft && !je(this.data.current, this.draft);
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
        this.conflict = ((r = i.response) == null ? void 0 : r.status) === 409 || this.conflict, this.error = Ce((s = i.response) == null ? void 0 : s.status);
        return;
      }
      this.data = i.data, this.draft = F(i.data.current), this.conflict = !1, this.confirmReset = !1, this.message = t;
    } catch {
      this.error = "errorNetwork";
    } finally {
      this.busy = !1;
    }
  }
  apply() {
    !this.draft || !this.data || !this.dirty || this.busy || this.conflict || this.request(
      () => Ee({
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
    !this.draft || !V.includes(t) || (this.draft = e === null ? { ...this.draft, defaultLevel: t } : {
      ...this.draft,
      overrides: this.draft.overrides.map(
        (r) => r.source === e ? { ...r, level: t } : r
      )
    }, this.message = "", this.confirmReset = !1);
  }
  async addSource(e) {
    var r, s;
    if (e.preventDefault(), !this.draft || (this.sourceError = Oe(this.source, this.draft.overrides), this.sourceError)) return;
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
    return y`<uui-select
      label=${e === null ? this.term("defaultLevelLabel") : this.term("namespaceLevelLabel", e)}
      .options=${V.map((s) => ({
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
    return y`<uui-box headline=${this.term("title")} aria-busy=${this.busy}>
      <p>${this.term("description")}</p>
      ${this.data ? y`<p class="muted">
            ${this.term("server", this.data.serverName)} · LogLevels 18.0.0
          </p>` : j}
      <div role="status" aria-live="polite">
        ${this.busy ? y`<uui-loader></uui-loader> ${this.data ? this.term("saving") : this.term("loading")}` : this.message ? this.term(this.message) : ""}
      </div>
      ${this.error ? y`<div class="notice error" role="alert">
            ${this.term(this.error)}
          </div>` : j}
      ${this.conflict ? y`<div class="notice">
            <p>${this.term("reloadWarning")}</p>
            <uui-button
              look="secondary"
              label=${this.term("discardReload")}
              @click=${this.load}
              ?disabled=${this.busy}
              >${this.term("discardReload")}</uui-button
            >
          </div>` : j}
      ${!this.data && !this.busy ? y`<uui-button
            look="secondary"
            label=${this.term("retry")}
            @click=${this.load}
            >${this.term("retry")}</uui-button
          >` : j}
      ${this.draft && this.data ? y`
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
      return y`<tr>
                      <th scope="row"><code>${e.source}</code></th>
                      <td>
                        ${r ? this.term(`level${r}`) : y`<span class="muted"
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
              ${this.sourceError ? y`<p class="error-text" role="alert">
                    ${this.term(this.sourceError)}
                  </p>` : j}
            </form>
            ${[
      this.draft.defaultLevel,
      ...this.draft.overrides.map((e) => e.level)
    ].some((e) => e === "Debug" || e === "Verbose") ? y`<p class="notice">${this.term("detailedWarning")}</p>` : j}
            <footer>
              <span
                >${this.dirty ? this.term("unapplied") : this.term("noChanges")}</span
              >
              <div class="actions">
                <uui-button
                  label=${this.term("discardDraft")}
                  ?disabled=${this.busy || !this.dirty}
                  @click=${() => {
      this.draft = F(this.data.current), this.sourceError = "", this.confirmReset = !1;
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
            ${this.confirmReset ? y`<section
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
                </section>` : j}
          ` : j}
    </uui-box>`;
  }
};
$.styles = [
  oe,
  re`
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
z([
  k()
], $.prototype, "data", 2);
z([
  k()
], $.prototype, "draft", 2);
z([
  k()
], $.prototype, "busy", 2);
z([
  k()
], $.prototype, "message", 2);
z([
  k()
], $.prototype, "error", 2);
z([
  k()
], $.prototype, "conflict", 2);
z([
  k()
], $.prototype, "confirmReset", 2);
z([
  k()
], $.prototype, "source", 2);
z([
  k()
], $.prototype, "sourceError", 2);
$ = z([
  se("loglevels-workspace-view")
], $);
export {
  $ as default
};

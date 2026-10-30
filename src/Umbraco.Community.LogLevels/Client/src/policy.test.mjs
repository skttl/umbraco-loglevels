import { test } from "node:test";
import assert from "node:assert/strict";
import {
  copyPolicy,
  samePolicy,
  validateSource,
  requestErrorKey,
} from "./policy.mjs";
test("drafts do not mutate active policy and removals are changes", () => {
  const current = {
    defaultLevel: "Warning",
    overrides: [{ source: "xyz", level: "Information" }],
  };
  const draft = copyPolicy(current);
  draft.overrides[0].level = "Debug";
  assert.equal(current.overrides[0].level, "Information");
  assert.equal(samePolicy(current, draft), false);
  draft.overrides = [];
  assert.equal(samePolicy(current, draft), false);
});
test("comparison ignores override order and namespace validation prevents ambiguous rows", () => {
  const a = {
    defaultLevel: "Warning",
    overrides: [
      { source: "a", level: "Debug" },
      { source: "b", level: "Error" },
    ],
  };
  assert.equal(
    samePolicy(a, { ...a, overrides: [...a.overrides].reverse() }),
    true,
  );
  assert.ok(validateSource(" ", []));
  assert.ok(validateSource("a b", []));
  assert.ok(validateSource(" a ", a.overrides));
  assert.equal(validateSource("xyz.Child", a.overrides), "");
});

test("namespace duplicates are rejected regardless of casing", () => {
  const rows = [{ source: "MyProject.Services", level: "Warning" }];
  assert.equal(validateSource(" myproject.SERVICES ", rows), "sourceDuplicate");
  assert.equal(validateSource("MyProject.Services.Child", rows), "");
});

test("namespace prefixes cannot contain empty dot-separated segments", () => {
  for (const source of [".MyProject", "MyProject.", "MyProject..Services"]) {
    assert.equal(validateSource(source, []), "sourceSegments");
  }
  assert.equal(validateSource("MyProject.Services", []), "");
});

test("server failures map to localizable safety-specific keys", () => {
  assert.equal(requestErrorKey(409), "errorConflict");
  assert.equal(requestErrorKey(401), "errorUnauthorized");
  assert.equal(requestErrorKey(403), "errorForbidden");
  assert.equal(requestErrorKey(503), "errorUnavailable");
  assert.equal(requestErrorKey(400), "errorValidation");
  assert.equal(requestErrorKey(500), "errorServer");
});

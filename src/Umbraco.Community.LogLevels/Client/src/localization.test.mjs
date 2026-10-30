import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import english from "./localization/en.mjs";
import { localizations } from "./localization/manifests.mjs";
import { levels, validateSource, requestErrorKey } from "./policy.mjs";
const placeholders = (text) =>
  [...text.matchAll(/\{\d+\}/g)].map((match) => match[0]).sort();

test("all eight registered cultures have complete nonempty catalogs and matching placeholders", async () => {
  assert.deepEqual(localizations.map((item) => item.meta.culture).sort(), [
    "da",
    "de",
    "en",
    "es",
    "fr",
    "it",
    "nl",
    "sv",
  ]);
  const keys = Object.keys(english.logLevels).sort();
  for (const manifest of localizations) {
    assert.equal(manifest.type, "localization");
    const { default: catalog } = await manifest.js();
    assert.deepEqual(
      Object.keys(catalog.logLevels).sort(),
      keys,
      manifest.meta.culture,
    );
    for (const key of keys) {
      assert.equal(
        typeof catalog.logLevels[key],
        "string",
        `${manifest.meta.culture}.${key}`,
      );
      assert.ok(
        catalog.logLevels[key].trim(),
        `${manifest.meta.culture}.${key}`,
      );
      assert.deepEqual(
        placeholders(catalog.logLevels[key]),
        placeholders(english.logLevels[key]),
        `${manifest.meta.culture}.${key}`,
      );
    }
  }
});

test("rendered terms and dynamic enum validation and status keys resolve in the English fallback", () => {
  const source = fs.readFileSync(
    new URL("./loglevels.element.ts", import.meta.url),
    "utf8",
  );
  const literalKeys = [...source.matchAll(/this\.term\("([^"]+)"/g)].map(
    (match) => match[1],
  );
  const statusKeys = [400, 401, 403, 409, 500, 503].map(requestErrorKey);
  const validationKeys = [
    validateSource("", []),
    validateSource("a b", []),
    validateSource(".a", []),
    validateSource("a", [{ source: "A" }]),
  ];
  for (const key of [
    ...literalKeys,
    ...statusKeys,
    ...validationKeys,
    "errorNetwork",
    "refreshed",
    "applied",
    "restored",
    ...levels.map((level) => `level${level}`),
  ]) {
    assert.ok(english.logLevels[key], key);
  }
  const entrypoint = fs.readFileSync(
    new URL("./entrypoint.ts", import.meta.url),
    "utf8",
  );
  assert.match(entrypoint, /label: "#logLevels_title"/);
  assert.match(entrypoint, /registry\.registerMany\(localizations\)/);
});

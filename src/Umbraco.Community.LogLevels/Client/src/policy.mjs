export const levels = [
  "Verbose",
  "Debug",
  "Information",
  "Warning",
  "Error",
  "Fatal",
];
export const copyPolicy = (policy) => ({
  defaultLevel: policy.defaultLevel,
  overrides: policy.overrides.map((row) => ({ ...row })),
});
export const samePolicy = (left, right) =>
  left.defaultLevel === right.defaultLevel &&
  left.overrides.length === right.overrides.length &&
  left.overrides.every((row) =>
    right.overrides.some(
      (other) => row.source === other.source && row.level === other.level,
    ),
  );
export const validateSource = (source, rows) => {
  const value = source.trim();
  if (!value) return "sourceRequired";
  if (/\s/.test(value)) return "sourceWhitespace";
  if (value.startsWith(".") || value.endsWith(".") || value.includes("..")) {
    return "sourceSegments";
  }
  if (rows.some((row) => row.source.toUpperCase() === value.toUpperCase())) {
    return "sourceDuplicate";
  }
  return "";
};

export const requestErrorKey = (status) => {
  if (status === 409) return "errorConflict";
  if (status === 401) return "errorUnauthorized";
  if (status === 403) return "errorForbidden";
  if (status === 503) return "errorUnavailable";
  if (status === 400) return "errorValidation";
  return "errorServer";
};

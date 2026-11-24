import { describe, it, expect } from "vitest";
import { resolveStratum } from "./controls";

const stratumVariables = [
  { name: "sex", options: [{ value: 1 }, { value: 2 }] },
  { name: "stage", options: [{ value: 0 }, { value: 3 }] },
];

describe("resolveStratum", () => {
  it("defaults every variable to its first option", () => {
    expect(resolveStratum({}, stratumVariables)).toEqual({ sex: 1, stage: 0 });
  });

  it("keeps valid stored values, normalizing select strings", () => {
    expect(resolveStratum({ sex: "2", stage: 3 }, stratumVariables)).toEqual({ sex: 2, stage: 3 });
  });

  it("replaces values not present in the results", () => {
    expect(resolveStratum({ sex: 5, stage: 3 }, stratumVariables)).toEqual({ sex: 1, stage: 3 });
  });

  it("returns an empty stratum when there are no variables", () => {
    expect(resolveStratum({ sex: 1 }, [])).toEqual({});
  });
});

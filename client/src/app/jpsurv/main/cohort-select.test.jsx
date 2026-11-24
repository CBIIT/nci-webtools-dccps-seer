import { describe, it, expect } from "vitest";
import { resolveSelection } from "./cohort-select";
import { defaultMain } from "../store";

const manifest = [
  "warning for cohort 3",
  { cohort_index: 1, cutpoint_index: 1, optimal_cutpoint: false },
  { cohort_index: 1, cutpoint_index: 2, optimal_cutpoint: true },
  { cohort_index: 2, cutpoint_index: 1, optimal_cutpoint: true },
  { cohort_index: 2, cutpoint_index: 2, optimal_cutpoint: false },
];

describe("resolveSelection", () => {
  it("defaults to the first cohort", () => {
    expect(resolveSelection(defaultMain, manifest, false).cohortIndex).toBe(1);
  });

  it("keeps a stored cohort that exists, normalizing select values", () => {
    expect(resolveSelection({ ...defaultMain, cohortIndex: "2" }, manifest, false).cohortIndex).toBe(2);
  });

  it("falls back when the stored cohort is not in the manifest", () => {
    expect(resolveSelection({ ...defaultMain, cohortIndex: 9 }, manifest, false).cohortIndex).toBe(1);
  });

  it("returns null cohort without a manifest", () => {
    expect(resolveSelection(defaultMain, undefined, false).cohortIndex).toBeNull();
  });

  it("leaves cutpoint and cluster unset for non-relax models", () => {
    const { cutpointIndex, cluster } = resolveSelection(defaultMain, manifest, false);
    expect(cutpointIndex).toBeNull();
    expect(cluster).toBeNull();
  });

  it("defaults relax models to the optimal cutpoint and cluster 1", () => {
    const { cohortIndex, cutpointIndex, cluster } = resolveSelection(defaultMain, manifest, true);
    expect({ cohortIndex, cutpointIndex, cluster }).toEqual({ cohortIndex: 1, cutpointIndex: 2, cluster: "uncond" });
  });

  it("keeps stored relax selections", () => {
    const stored = { ...defaultMain, cohortIndex: 2, cutpointIndex: "2", cluster: "cond" };
    const { cutpointIndex, cluster } = resolveSelection(stored, manifest, true);
    expect({ cutpointIndex, cluster }).toEqual({ cutpointIndex: 2, cluster: "cond" });
  });

  it("forces cluster 1 for the first cutpoint", () => {
    const stored = { ...defaultMain, cohortIndex: 2, cutpointIndex: 1, cluster: "cond" };
    expect(resolveSelection(stored, manifest, true).cluster).toBe("uncond");
  });

  it("preserves fitIndex and precision", () => {
    const stored = { ...defaultMain, fitIndex: 3, precision: 4 };
    const { fitIndex, precision } = resolveSelection(stored, manifest, false);
    expect({ fitIndex, precision }).toEqual({ fitIndex: 3, precision: 4 });
  });
});

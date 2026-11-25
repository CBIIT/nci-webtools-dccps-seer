import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "./footer";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Footer version and date", () => {
  it.each([
    ["jpsurv_4.0.0_20260106", "2026-11-24", "4.0.0", "2026-11-24"],
    ["dev", "2026-11-24", "dev", "2026-11-24"],
    ["jpsurv_4.0.0_20260106", undefined, "4.0.0", "2026-01-06"],
    ["jpsurv_4.0.0_20260106", "", "4.0.0", "2026-01-06"],
    ["local", undefined, "local", "N/A"],
    ["dev", "", "dev", "N/A"],
    [undefined, "2026-11-24", "missing env: NEXT_PUBLIC_VERSION", "2026-11-24"],
    [undefined, undefined, "missing env: NEXT_PUBLIC_VERSION", "N/A"],
  ])(
    "displays version %s with last-updated metadata %s",
    (version, lastUpdated, expectedVersion, expectedDate) => {
      vi.stubEnv("NEXT_PUBLIC_VERSION", version);
      vi.stubEnv("NEXT_PUBLIC_LAST_UPDATED", lastUpdated);

      render(<Footer />);

      expect(screen.getByRole("link", { name: `Version: ${expectedVersion}` }))
        .toHaveAttribute("href", "https://github.com/CBIIT/nci-webtools-dccps-seer");
      expect(screen.getByText(`Last Updated: ${expectedDate}`)).toBeVisible();
    }
  );
});

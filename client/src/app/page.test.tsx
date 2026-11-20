import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

test("renders the home page and links to each survival tool", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { level: 1, name: "Survival Stats Tools" })).toBeDefined();

  for (const [title, path] of [
    ["JPSurv", "/jpsurv"],
    ["CanSurv", "/cansurv"],
    ["RecurRisk", "/recurrence"],
  ]) {
    expect(screen.getByRole("link", { name: new RegExp(`^${title}`) }).getAttribute("href")).toBe(path);
  }
});

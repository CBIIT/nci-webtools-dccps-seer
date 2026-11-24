import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewDataModal from "./review-data-modal";
import seerStat from "@/test/fixtures/seer-stat.json";

const seerDataset = { label: "SEER*Stat", data: seerStat.seerStatData, dictionary: seerStat.seerStatDictionary };
const canSurvDataset = { label: "CanSurv", data: seerStat.canSurvData };

function renderModal(props) {
  const onHide = vi.fn();
  const utils = render(<ReviewDataModal show onHide={onHide} datasets={[seerDataset]} {...props} />);
  return { ...utils, onHide, user: userEvent.setup() };
}

function dataTable() {
  return within(screen.getByRole("dialog")).getByRole("table");
}

function headerTexts() {
  return within(dataTable())
    .getAllByRole("columnheader")
    .map((th) => th.textContent);
}

function rowTexts(index) {
  const [, tbody] = within(dataTable()).getAllByRole("rowgroup");
  return within(within(tbody).getAllByRole("row")[index])
    .getAllByRole("cell")
    .map((td) => td.textContent);
}

describe("ReviewDataModal", () => {
  it("is hidden until opened", () => {
    renderModal({ show: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("previews SEER*Stat data using dictionary labels for headers and coded values", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toHaveTextContent("Review Data");
    expect(headerTexts().slice(0, 5)).toEqual([
      "SEER historic stage LRD",
      "Year of diagnosis BC",
      "Age breast",
      "Interval",
      "Alive at Start",
    ]);
    expect(rowTexts(0).slice(0, 5)).toEqual(["Localized", "1985-89", "15-59", "<1 yr", "13713"]);
  });

  it("shows the original coded values when labels are turned off", async () => {
    const { user } = renderModal();

    await user.click(screen.getByLabelText("Show Labels"));

    expect(rowTexts(0).slice(0, 5)).toEqual(["0", "0", "0", "1", "13713"]);
  });

  it("limits the preview to the selected number of lines", async () => {
    const { user } = renderModal();
    expect(screen.getByText("Showing 20 of 25 rows")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Display Lines"), "30");

    expect(screen.getByText("Showing 25 of 25 rows")).toBeInTheDocument();
  });

  it("only offers a dataset picker when there is more than one dataset", () => {
    renderModal();

    expect(screen.queryByLabelText("Dataset")).not.toBeInTheDocument();
  });

  it("switches to RecurRisk's CanSurv dataset and infers columns from its rows", async () => {
    const { user } = renderModal({ datasets: [seerDataset, canSurvDataset] });

    await user.selectOptions(screen.getByLabelText("Dataset"), "CanSurv");

    expect(headerTexts().slice(0, 3)).toEqual(["Link", "Stratum_1__SEER_historic_stage_LRD", "Stratum_2__Age_breast"]);
    expect(rowTexts(0).slice(0, 2)).toEqual(["Weibull", "0"]);
    expect(screen.getByText("Showing 4 of 4 rows")).toBeInTheDocument();
    expect(screen.queryByLabelText("Show Labels")).not.toBeInTheDocument();
  });

  it("returns to the first dataset when the selected one is no longer available", async () => {
    const { user, rerender, onHide } = renderModal({ datasets: [seerDataset, canSurvDataset] });
    await user.selectOptions(screen.getByLabelText("Dataset"), "CanSurv");

    rerender(<ReviewDataModal show onHide={onHide} datasets={[seerDataset]} />);

    expect(screen.getByText("Showing 20 of 25 rows")).toBeInTheDocument();
    expect(headerTexts()[0]).toBe("SEER historic stage LRD");
  });

  it("explains when there is no data to preview", () => {
    renderModal({ datasets: [{ label: "SEER*Stat", data: [] }] });

    expect(screen.getByText("Showing 0 of 0 rows")).toBeInTheDocument();
    expect(screen.getByText("No data to display.")).toBeInTheDocument();
  });

  it("calls onHide from the footer Close button", async () => {
    const { user, onHide } = renderModal();

    const closeButtons = within(screen.getByRole("dialog")).getAllByRole("button", { name: "Close" });
    await user.click(closeButtons.at(-1));

    expect(onHide).toHaveBeenCalledOnce();
  });
});

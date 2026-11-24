import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DatasetTable from "./dataset-table";
import { downloadDataset } from "@/services/xlsx";
import { scaleData } from "@/services/seer-results-transform";
import { getSurvYearColumns } from "@/app/jpsurv/main/table-columns";
import { getCureModelColumns } from "@/app/recurrence/main/tab-cure-model/columns";
import jpsurv from "@/test/fixtures/jpsurv.json";
import recurrence from "@/test/fixtures/recurrence.json";

vi.mock("@/services/xlsx", () => ({ downloadDataset: vi.fn() }));

const fiveYear = scaleData(jpsurv.fullpredicted.filter((row) => row.Interval === 5), 100);
const survYearColumns = getSurvYearColumns({
  params: jpsurv.params,
  observedHeader: "Relative_Survival_Cum",
  observedSeHeader: "Relative_SE_Cum",
  predictedHeader: "Predicted_Survival_Cum",
  predictedSeHeader: "Predicted_Survival_Cum_SE",
  precision: 2,
});
const settingsRows = [
  ["Statistic", "Relative Survival"],
  ["Years Since Diagnosis", "5"],
];

beforeEach(() => {
  vi.mocked(downloadDataset).mockClear();
});

describe("DatasetTable", () => {
  it("shows the row count and the table built from the column specs", () => {
    render(
      <DatasetTable
        data={fiveYear}
        columns={survYearColumns}
        filename="survByYear"
        getSettingsRows={() => settingsRows}
      />
    );

    expect(screen.getByText("Total Row Count: 12")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Relative Survival Cumulative (%)" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "46.04" })).toBeInTheDocument();
  });

  it("downloads the same rows and column specs with the plot title as the first settings row", async () => {
    const user = userEvent.setup();
    const getSettingsRows = vi.fn(() => settingsRows);
    const title = "Relative Survival by Diagnosis Year";
    render(
      <DatasetTable
        title={title}
        data={fiveYear}
        columns={survYearColumns}
        filename="survByYear - Model 1 - 0"
        getSettingsRows={getSettingsRows}
      />
    );
    expect(getSettingsRows).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Download Graph Dataset" }));

    expect(downloadDataset).toHaveBeenCalledExactlyOnceWith(
      fiveYear,
      survYearColumns,
      [["Plot", title], ...settingsRows],
      "survByYear - Model 1 - 0"
    );
  });

  it("downloads only the provided settings rows when there is no plot title", async () => {
    const user = userEvent.setup();
    render(
      <DatasetTable data={fiveYear} columns={survYearColumns} filename="survByYear" getSettingsRows={() => settingsRows} />
    );

    await user.click(screen.getByRole("button", { name: "Download Graph Dataset" }));

    expect(downloadDataset).toHaveBeenCalledWith(fiveYear, survYearColumns, settingsRows, "survByYear");
  });

  it("disables download when there is no data", () => {
    render(<DatasetTable data={[]} columns={survYearColumns} filename="empty" getSettingsRows={() => []} />);

    expect(screen.getByText("Total Row Count: 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Graph Dataset" })).toBeDisabled();
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("passes column header and table options through for RecurRisk tabs", () => {
    render(
      <DatasetTable
        data={recurrence.results}
        columns={getCureModelColumns({ precision: 4 })}
        filename="cureModel"
        getSettingsRows={() => []}
        useColumnHeader
        useSort
        usePagination
        emptyMessage="No data available for this stratum"
      />
    );

    expect(screen.getByText("Total Row Count: 24")).toBeInTheDocument();
    expect(screen.getByText("1\u201310 of 24")).toBeInTheDocument();
    expect(screen.getByText("Fitted net cancer survival (%)")).toHaveAttribute("tabindex", "0");
  });
});

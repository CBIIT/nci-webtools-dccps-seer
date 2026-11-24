import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Results from "./results";
import { downloadGroupResults } from "@/services/xlsx";
import recurrence from "@/test/fixtures/recurrence.json";
import seerStat from "@/test/fixtures/seer-stat.json";

vi.mock("@/services/xlsx", () => ({ downloadGroupResults: vi.fn() }));

const seerData = {
  seerStatDictionary: seerStat.seerStatDictionary,
  seerStatDataFileNames: ["groupdata_example_seer.dic", "groupdata_example_seer.txt"],
  canSurvDataFileName: "groupdata_example_cansurv.csv",
};

const params = {
  id: "e34d3a6a-d5ae-4683-bcec-6c19abfc1e1b",
  inputType: "data",
  stageVariable: "SEER_historic_stage_LRD",
  distantStageValue: 2,
  adjustmentFactorR: 1,
  followUpYears: 30,
  strataOptions: [
    {
      name: "SEER_historic_stage_LRD",
      label: "SEER historic stage LRD",
      options: [
        { value: 0, label: "Localized", checked: true },
        { value: 1, label: "Regional", checked: true },
        { value: 2, label: "Distant", checked: true },
      ],
    },
  ],
  sendNotification: false,
};

beforeEach(() => {
  vi.mocked(downloadGroupResults).mockClear();
});

function renderResults(props) {
  render(<Results data={recurrence.results} params={params} seerData={seerData} precision={4} {...props} />);
  return userEvent.setup();
}

function cell(rowIndex, header) {
  const table = screen.getByRole("table");
  const headers = within(table).getAllByRole("columnheader");
  const columnIndex = headers.findIndex((th) => th.textContent === header);
  const [, tbody] = within(table).getAllByRole("rowgroup");
  return within(within(tbody).getAllByRole("row")[rowIndex]).getAllByRole("cell")[columnIndex].textContent;
}

describe("RecurRisk Results table", () => {
  it("labels strata with SEER*Stat dictionary names and other columns from the catalog", () => {
    renderResults();

    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers.slice(0, 7)).toEqual([
      "SEER historic stage LRD",
      "Age breast",
      "Year of diagnosis BC",
      "Follow-up years",
      "Survival distribution for the noncured fraction",
      "Adjustment factor r",
      "Statistically cured fraction",
    ]);
  });

  it("shows strata values as labels instead of codes", () => {
    renderResults();

    expect(cell(0, "SEER historic stage LRD")).toBe("Localized");
    expect(cell(0, "Age breast")).toBe("15-59");
    expect(cell(0, "Year of diagnosis BC")).toBe("1985-89");
  });

  it("formats numbers at the selected precision, joins arrays, and leaves missing values blank", () => {
    const data = [{ ...recurrence.results[0], obs_dist_surv: null }];
    renderResults({ data, precision: 3 });

    expect(cell(0, "Statistically cured fraction")).toBe("0.734");
    expect(cell(0, "Standard error of net recurrence risk - analytical")).toBe("0.004");
    expect(cell(0, "Survival distribution for the noncured fraction")).toBe("Weibull");
    expect(cell(0, "Input net survival for metastatic disease at diagnosis")).toBe("");
  });

  it("explains columns with header tooltips", async () => {
    const user = renderResults();

    await user.hover(screen.getByText("Adjustment factor r"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/adjusts the cancer mortality hazard/);
  });

  it("filters strata by label", async () => {
    const user = renderResults();

    const stageFilter = screen.getByLabelText("Filter SEER historic stage LRD");
    expect(within(stageFilter).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "---",
      "Localized",
      "Regional",
    ]);

    await user.selectOptions(stageFilter, "Regional");

    expect(screen.getByText("1\u201310 of 12")).toBeInTheDocument();
    expect(cell(0, "Statistically cured fraction")).toBe("0.4490");
  });

  it("filters follow-up years by exact value", async () => {
    const user = renderResults();

    await user.selectOptions(screen.getByLabelText("Filter Follow-up years"), "1");

    expect(screen.getByText("1\u20132 of 2")).toBeInTheDocument();
  });

  it("filters numeric columns by typed text", async () => {
    const user = renderResults();

    await user.type(screen.getByLabelText("Filter Statistically cured fraction"), "0.44");

    expect(screen.getByText("1\u201310 of 12")).toBeInTheDocument();
    expect(cell(0, "SEER historic stage LRD")).toBe("Regional");
  });

  it("shows the default result columns and disables Save when there are no results", () => {
    renderResults({ data: [] });

    expect(screen.getByRole("columnheader", { name: "Follow-up years" })).toBeInTheDocument();
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  describe("Save", () => {
    it("exports labeled rows and the analysis parameters for the job", async () => {
      const user = renderResults();

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(downloadGroupResults).toHaveBeenCalledOnce();
      const [rows, parameterRows, filename] = vi.mocked(downloadGroupResults).mock.calls[0];
      expect(filename).toBe("recurrisk_group_data_results_e34d3a6a-d5ae-4683-bcec-6c19abfc1e1b");
      expect(rows).toHaveLength(24);
      expect(rows[0]).toMatchObject({
        "SEER historic stage LRD": "Localized",
        "Follow-up years": 1,
        "Statistically cured fraction": 0.733967,
        "Standard error of net recurrence risk - analytical": "0.00422018",
      });
      expect(parameterRows).toEqual(
        expect.arrayContaining([
          ["Job ID", params.id],
          ["Distant Stage Value", "2 - Distant"],
          ["SEER*Stat Files", "groupdata_example_seer.dic, groupdata_example_seer.txt"],
          ["Strata: SEER historic stage LRD", "All"],
        ])
      );
    });

    it("uses a generic file name when the job has no id", async () => {
      const user = renderResults({ params: { ...params, id: undefined } });

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(vi.mocked(downloadGroupResults).mock.calls[0][2]).toBe("recurrisk_group_data_results");
    });
  });
});

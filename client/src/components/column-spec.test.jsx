import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table from "./table";
import { toTableColumns } from "./column-spec";
import { scaleData } from "@/services/seer-results-transform";
import { getSurvYearColumns } from "@/app/jpsurv/main/table-columns";
import { getActuarialColumns, getLoglikeColumns } from "@/app/cansurv/main/table-columns";
import { getValueToLabelMap } from "@/app/cansurv/main/controls";
import { getCureModelColumns } from "@/app/recurrence/main/tab-cure-model/columns";
import jpsurv from "@/test/fixtures/jpsurv.json";
import cansurv from "@/test/fixtures/cansurv.json";
import recurrence from "@/test/fixtures/recurrence.json";

function renderSpecs(data, specs, options) {
  render(<Table data={data} columns={toTableColumns(specs, options)} />);
}

function headerTexts() {
  return screen.getAllByRole("columnheader").map((th) => th.textContent);
}

function rowTexts(index) {
  const [, tbody] = within(screen.getByRole("table")).getAllByRole("rowgroup");
  return within(within(tbody).getAllByRole("row")[index])
    .getAllByRole("cell")
    .map((td) => td.textContent);
}

describe("toTableColumns", () => {
  it("keeps each spec id as the react-table column id", () => {
    const specs = getCureModelColumns({ precision: 4 });

    expect(toTableColumns(specs).map((c) => c.id)).toEqual(["followup", "obs_surv", "surv_curemodel"]);
  });
});

describe("JPSurv Survival vs. Year of Diagnosis columns", () => {
  const { params } = jpsurv;
  const fiveYear = scaleData(jpsurv.fullpredicted.filter((row) => row.Interval === 5), 100);
  const headers = {
    observedHeader: "Relative_Survival_Cum",
    observedSeHeader: "Relative_SE_Cum",
    predictedHeader: "Predicted_Survival_Cum",
    predictedSeHeader: "Predicted_Survival_Cum_SE",
  };

  it("labels cohort, year, interval, and survival columns", () => {
    renderSpecs(fiveYear, getSurvYearColumns({ params, ...headers, precision: 2 }));

    expect(headerTexts()).toEqual([
      "Site recode NHL &CML",
      "Year of Diagnosis",
      "Time Since Diagnosis",
      "Relative Survival Cumulative (%)",
      "Relative Survival Cumulative Std. Err. (%)",
      "Predicted Cumulative Survival (%)",
      "Predicted Cumulative Survival Std. Err. (%)",
    ]);
  });

  it("formats survival values at the selected precision", () => {
    renderSpecs(fiveYear, getSurvYearColumns({ params, ...headers, precision: 2 }));

    expect(rowTexts(0)).toEqual(["Non-Hodgkin Lymphoma", "1975", "5", "46.04", "1.34", "41.25", "0.66"]);
  });

  it("uses conditional labels after conditional recalculation", () => {
    renderSpecs(
      fiveYear,
      getSurvYearColumns({
        params,
        observedHeader: "observed",
        observedSeHeader: "observed_se",
        predictedHeader: "pred_cum",
        predictedSeHeader: "pred_cum_se",
        isRecalcCond: true,
        precision: 2,
      })
    );

    expect(headerTexts().slice(3)).toEqual([
      "Conditional Relative Survival (%)",
      "Conditional Relative Survival Std. Err. (%)",
      "Predicted Conditional Cumulative Survival (%)",
      "Predicted Conditional Cumulative Survival Std. Err. (%)",
    ]);
  });

  it("shows NA for missing survival values", () => {
    const [first] = fiveYear;
    renderSpecs([{ ...first, Relative_SE_Cum: null }], getSurvYearColumns({ params, ...headers, precision: 2 }));

    expect(rowTexts(0)[4]).toBe("NA");
  });
});

describe("CanSurv columns", () => {
  it("shows the log-likelihood profile, including NA where the model could not be evaluated", () => {
    renderSpecs(cansurv.profileLL, getLoglikeColumns({ precision: 4 }));

    expect(headerTexts()).toEqual(["Cure Fraction C", "Log(L)"]);
    expect(rowTexts(0)).toEqual(["0", "-11514.7000"]);
    expect(rowTexts(10)).toEqual(["1", "NA"]);
  });

  describe("Estimated and Actuarial Survival", () => {
    const stratumLabel = "15-44 / I / Male and female / Non-Spanish-Hispanic-Latino";
    const valueToLabelMap = getValueToLabelMap(cansurv.cohortVariables, { 0: stratumLabel });
    const seerData = { cohortVariables: cansurv.cohortVariables };

    function actuarialSpecs(data, formState = {}) {
      return getActuarialColumns({ data, formState, seerData, valueToLabelMap, precision: 2 });
    }

    it("shows the stratum, interval, survival percentages, and cure fraction", () => {
      renderSpecs(cansurv.data, actuarialSpecs(cansurv.data));

      expect(headerTexts()).toEqual([
        "Stratum",
        "Time Since Diagnosis",
        "Observed (%)",
        "Estimated (%)",
        "Cure Fraction (%)",
      ]);
      expect(rowTexts(0)).toEqual([stratumLabel, "1", "99.92", "99.88", "88.61"]);
    });

    it("adds labeled columns for sub-stratum variables selected in the form", () => {
      renderSpecs(cansurv.data, actuarialSpecs(cansurv.data, { Sex: 0 }));

      expect(headerTexts()).toContain("Sex");
      expect(rowTexts(0)).toContain("Male and female");
    });

    it("omits the cure fraction column for models without a cure fraction", () => {
      const data = cansurv.data.map((row) => {
        const copy = { ...row };
        delete copy[".Cure.Fraction"];
        return copy;
      });
      renderSpecs(data, actuarialSpecs(data));

      expect(headerTexts()).not.toContain("Cure Fraction (%)");
    });
  });
});

describe("RecurRisk column headers with definitions", () => {
  const specs = getCureModelColumns({ precision: 4 });

  it("labels columns from the RecurRisk column catalog", () => {
    renderSpecs(recurrence.results, specs, { useColumnHeader: true });

    expect(headerTexts()).toEqual([
      "Follow-up years",
      "Input net cancer survival (%)",
      "Fitted net cancer survival (%)",
    ]);
    expect(rowTexts(0)).toEqual(["1", "99.7150", "99.2161"]);
  });

  it("shows the column definition in a tooltip on hover", async () => {
    const user = userEvent.setup();
    renderSpecs(recurrence.results, specs, { useColumnHeader: true });

    await user.hover(screen.getByText("Fitted net cancer survival (%)"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/Net survival from diagnosis estimated by the mixture cure model/);
  });

  it("makes headers with definitions keyboard focusable", () => {
    renderSpecs(recurrence.results, specs, { useColumnHeader: true });

    expect(screen.getByText("Fitted net cancer survival (%)")).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Follow-up years")).not.toHaveAttribute("tabindex");
  });

  it("renders plain text headers when column headers are not requested", () => {
    renderSpecs(recurrence.results, specs);

    expect(screen.getByRole("columnheader", { name: "Fitted net cancer survival (%)" }).firstChild).toBeInstanceOf(Text);
  });
});

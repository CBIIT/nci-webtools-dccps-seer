import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "./table";
import { toTableColumns } from "./column-spec";
import { getCureModelColumns } from "@/app/recurrence/main/tab-cure-model/columns";
import cansurv from "@/test/fixtures/cansurv.json";
import recurrence from "@/test/fixtures/recurrence.json";

const helper = createColumnHelper();

function bodyRows() {
  const [, tbody] = within(screen.getByRole("table")).getAllByRole("rowgroup");
  return within(tbody).getAllByRole("row");
}

function firstCellTexts() {
  return bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("Table: CanSurv final estimates (no table features)", () => {
  const precision = 4;
  const columns = [
    helper.accessor("parameter", { header: () => "Parameter", cell: (info) => info.getValue() }),
    helper.accessor("Estimate", { header: () => "Estimate", cell: (info) => info.getValue().toFixed(precision) }),
    helper.accessor((e) => e["Std. Error"], {
      id: "stderr",
      header: () => "Std. Error",
      cell: (info) => info.getValue().toFixed(precision),
    }),
  ];

  it("renders every estimate row with formatted values", () => {
    render(<Table data={cansurv.estimates} columns={columns} size="sm" />);

    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Parameter",
      "Estimate",
      "Std. Error",
    ]);
    expect(bodyRows()).toHaveLength(3);
    expect(within(bodyRows()[0]).getAllByRole("cell").map((td) => td.textContent)).toEqual([
      "cure.(Intercept)",
      "2.0513",
      "0.1074",
    ]);
    expect(screen.getByRole("table")).toHaveClass("table-sm");
  });

  it("does not render search, filter, or pagination controls unless enabled", () => {
    render(<Table data={cansurv.estimates} columns={columns} />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Page size")).not.toBeInTheDocument();
  });

  it("shows the custom message spanning all columns when the model did not converge", () => {
    render(
      <Table
        data={[]}
        columns={columns}
        emptyMessage={<div>CanSurv has failed to converge.</div>}
      />
    );

    const cell = screen.getByText("CanSurv has failed to converge.").closest("td");
    expect(cell).toHaveAttribute("colspan", "3");
  });

  it("falls back to a default empty message", () => {
    render(<Table data={[]} columns={columns} />);

    expect(screen.getByText("No data available")).toBeInTheDocument();
  });
});

describe("Table: RecurRisk cure model tab (useSort + usePagination)", () => {
  const columns = toTableColumns(getCureModelColumns({ precision: 4 }), { useColumnHeader: true });

  function renderCureModel() {
    render(<Table data={recurrence.results} columns={columns} useSort usePagination />);
    return userEvent.setup();
  }

  it("shows the first page of 10 rows with the range summary", () => {
    renderCureModel();

    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByText("1\u201310 of 24")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "\u2039" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "\u203a" })).toBeEnabled();
  });

  it("moves between pages with the next/previous buttons and the page picker", async () => {
    const user = renderCureModel();

    await user.click(screen.getByRole("button", { name: "\u203a" }));
    expect(screen.getByText("11\u201320 of 24")).toBeInTheDocument();
    expect(firstCellTexts()[0]).toBe("11");

    await user.selectOptions(screen.getByLabelText("Go to page"), "3");
    expect(screen.getByText("21\u201324 of 24")).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(4);
    expect(screen.getByRole("button", { name: "\u203a" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "\u2039" }));
    expect(screen.getByText("11\u201320 of 24")).toBeInTheDocument();
  });

  it("shows all rows when the page size is increased", async () => {
    const user = renderCureModel();

    await user.selectOptions(screen.getByLabelText("Page size"), "25");

    expect(bodyRows()).toHaveLength(24);
    expect(screen.getByText("1\u201324 of 24")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to page")).toHaveDisplayValue("1");
  });

  it("sorts by a column when its header is clicked and indicates the direction", async () => {
    const user = renderCureModel();
    const header = () => screen.getByRole("columnheader", { name: /Fitted net cancer survival/ });
    const fittedValues = () => bodyRows().map((row) => within(row).getAllByRole("cell")[2].textContent);

    await user.click(header());
    expect(header()).toHaveTextContent("\u2193");
    expect(fittedValues()[0]).toBe("99.2161");

    await user.click(header());
    expect(header()).toHaveTextContent("\u2191");
    expect(fittedValues()[0]).toBe("56.9786");
  });
});

describe("Table: RecurRisk results (useColumnFilter + componentHeader)", () => {
  const selectFilterFn = (row, columnId, value) => String(row.getValue(columnId)) === value;
  const columns = [
    helper.accessor("followup", {
      header: () => "Follow-up years",
      meta: { filterVariant: "select", filterLabel: "Follow-up years" },
      filterFn: selectFilterFn,
    }),
    helper.accessor("link", {
      header: () => "Survival distribution",
      meta: { filterVariant: "select", filterLabel: "Survival distribution" },
      filterFn: selectFilterFn,
    }),
    helper.accessor("cure", {
      header: () => "Statistically cured fraction",
      cell: (info) => info.getValue().toFixed(4),
      meta: { filterLabel: "Statistically cured fraction" },
    }),
  ];

  function renderResults() {
    render(
      <Table
        data={recurrence.results}
        columns={columns}
        componentHeader={[<button key="save">Save</button>]}
        size="sm"
        useColumnFilter
        useSort
        usePagination
      />
    );
    return userEvent.setup();
  }

  it("renders header components alongside the table", () => {
    renderResults();

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("offers each distinct value, sorted numerically, as a select filter option", () => {
    renderResults();

    const options = within(screen.getByLabelText("Filter Follow-up years")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["---", ...Array.from({ length: 12 }, (_, i) => String(i + 1))]);
    expect(
      within(screen.getByLabelText("Filter Survival distribution"))
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["---", "Weibull"]);
  });

  it("filters rows to the selected value and can be cleared", async () => {
    const user = renderResults();

    await user.selectOptions(screen.getByLabelText("Filter Follow-up years"), "3");
    expect(screen.getByText("1\u20132 of 2")).toBeInTheDocument();
    expect(firstCellTexts()).toEqual(["3", "3"]);

    await user.selectOptions(screen.getByLabelText("Filter Follow-up years"), "---");
    expect(screen.getByText("1\u201310 of 24")).toBeInTheDocument();
  });

  it("filters a numeric column by the typed value", async () => {
    const user = renderResults();

    await user.type(screen.getByLabelText("Filter Statistically cured fraction"), "0.73");

    expect(screen.getByText("1\u201310 of 12")).toBeInTheDocument();
    expect(bodyRows().every((row) => within(row).getAllByRole("cell")[2].textContent === "0.7340")).toBe(true);
  });

  it("shows an empty table and a zero range when no rows match", async () => {
    const user = renderResults();

    await user.type(screen.getByLabelText("Filter Statistically cured fraction"), "0.99");

    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.getByText("0 of 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to page")).toBeDisabled();
  });
});

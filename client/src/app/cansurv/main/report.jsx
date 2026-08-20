import { Container, Row, Col } from "react-bootstrap";
import { useMemo } from "react";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";
import { groupBy } from "lodash";
import { getValueToLabelMap } from "./controls";

export default function Report({ data, seerData, precision, stratumIndex = 0 }) {
  const fit = useMemo(() => {
    return data["fit.list"][stratumIndex] ?? data["fit.list"][0];
  }, [data, stratumIndex]);

  const valueToLabelMap = useMemo(() => getValueToLabelMap(seerData.cohortVariables), [seerData]);

  const cureFractionTable = useMemo(() => {
    const subs = seerData.cohortVariables.map((e) => e.name);
    return Object.values(groupBy(fit.data, (item) => subs.map((key) => item[key]))).map((group) => group[0]); // Get the first item from each group
  }, [fit.data, seerData.cohortVariables]);

  const llKeys = ["init.loglike", "loglike", "converged"];
  const loglikeTable = Object.entries(fit.fitlist)
    .filter(([key, _]) => llKeys.includes(key))
    .map(([key, value]) => ({ parameter: key, value }));

  const columnHelper = createColumnHelper();
  const columnEstimates = [
    columnHelper.accessor("parameter", {
      header: () => "Parameter",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("Estimate", {
      header: () => "Estimate",
      cell: (info) => info.getValue().toFixed(precision),
    }),
    columnHelper.accessor((e) => e["Std. Error"], {
      id: "stderr",
      header: () => "Std. Error",
      cell: (info) => info.getValue().toFixed(precision),
    }),
  ];
  const columnLoglike = [
    columnHelper.accessor("parameter", {
      header: () => "Parameter",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("value", {
      header: () => "Value",
      cell: (info) => {
        const value = info.getValue();
        if (typeof value === "number") return value.toFixed(precision);
        if (value && typeof value === "object" && Object.keys(value).length === 0) return "NA";
        return value?.toString?.() ?? "NA";
      },
    }),
  ];
  const columnCure = [
    ...seerData.cohortVariables.map((e) =>
      columnHelper.accessor(e.name, {
        header: () => e.label,
        cell: (info) => valueToLabelMap[e.name][info.getValue()],
      })
    ),
    columnHelper.accessor((e) => e[".Cure.Fraction"], {
      id: "cure-fraction",
      header: () => "Cure Fraction",
      cell: (info) => {
        const value = info.getValue();
        if (!value) return "NA";
        const numValue = Array.isArray(value) ? value[0] : value;
        return numValue.toFixed(precision);
      },
    }),
  ];

  return (
    <Container className="p-3">
      <Row>
        <Col>
          <h4>Number of Cohorts and Follow-Up Intervals</h4>
          <ul>
            <li>Number of Cohorts: {fit.obj.nsets}</li>
            <li>Number of Follow-Up Intervals: {fit.obj.nint}</li>
          </ul>
        </Col>
      </Row>
      <Row>
        <Col>
          <h4>Final Estimates and Tests</h4>
          <Table
            data={fit.fitlist.estimates}
            columns={columnEstimates}
            size="sm"
            emptyMessage={
              <div>
                CanSurv has failed to converge. Please review your data and/or model inputs to ensure that they have
                been entered correctly. If further issues persist, please refer to the CanSurv Help Page (link to the
                tool Help page) or email{" "}
                <a href="mailto:NCIJPSurvWebAdmin@mail.nih.gov">NCIJPSurvWebAdmin@mail.nih.gov</a>.
              </div>
            }
          />
          <Table data={loglikeTable} columns={columnLoglike} size="sm" />
        </Col>
      </Row>
      <Row>
        <Col>
          <h4>Cure Fractions</h4>
          <Table data={cureFractionTable} columns={columnCure} size="sm" />
        </Col>
      </Row>
    </Container>
  );
}

"use client";
import { useMemo } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import { toTableColumns } from "@/components/column-spec";
import { downloadDataset } from "@/services/xlsx";
import { useStore } from "../../store";
import { getJpsurvSettingsRows } from "../download-settings";

const COEF_COLUMNS = [
  { id: "_row", label: "Parameter", getValue: (row) => row._row },
  { id: "Estimates", label: "Estimate (%)", getValue: (row) => row.Estimates },
  { id: "stderror", label: "Standard Error (%)", getValue: (row) => row["Std.Error"] },
];

export default function ModelEstimates({ data, results, params, cohortIndex, fitIndex, precision, selection }) {
  const seerData = useStore((state) => state.seerData);
  const coefMemo = useMemo(
    () =>
      data
        ? data[fitIndex].map((e) => ({
            ...e,
            "Estimates": e.Estimates.toFixed(precision),
            "Std.Error": e["Std.Error"].toFixed(precision),
          }))
        : [],
    [data, fitIndex, precision]
  );
  const columnHelper = createColumnHelper();
  const coefColumns = toTableColumns(COEF_COLUMNS);
  const resultsMemo = useMemo(
    () =>
      results
        ? [
            { key: "Bayesian Information Criterion (BIC)", value: results.bic.toFixed(precision) },
            { key: "Akaike Information Criterial (AIC)", value: results.aic },
            { key: "Log Likelihood", value: results.ll },
            { key: "Converged", value: results.converged ? "Yes" : "No" },
          ]
        : [],
    [results, precision]
  );
  const resultsColumns = [
    columnHelper.accessor("key", {
      header: () => "Estimates",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor("value", {
      header: () => `Joinpoint ${fitIndex}`,
      cell: (info) => info.renderValue(),
    }),
  ];

  return (
    <Container>
      <Row className="justify-content-end">
        <Col sm="auto">
          <Button
            variant="link"
            onClick={() =>
              downloadDataset(
                coefMemo,
                COEF_COLUMNS,
                [["Plot", "Model Estimates"], ...getJpsurvSettingsRows(params, seerData, { main: selection, conditionalIntervals: null })],
                `Model Estimates ${fitIndex} - ${cohortIndex}`
              )
            }>
            Download Model Estimates
          </Button>
        </Col>
      </Row>
      <Row>
        <Col className="p-3">
          {resultsMemo && (
            <div>
              <h5>Estimates of the Joinpoints</h5>
              <Table data={resultsMemo} columns={resultsColumns} />
            </div>
          )}
        </Col>
      </Row>
      <Row>
        <Col className="p-3">
          {coefMemo && (
            <div>
              <h5>Coefficients</h5>
              <Table data={coefMemo} columns={coefColumns} />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}

"use client";
import { useMemo } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import { downloadTable } from "@/services/xlsx";

export default function ModelEstimates({ data, results, params, cohortIndex, fitIndex, precision }) {
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
  const coefColumns = [
    columnHelper.accessor("_row", {
      header: () => "Parameter",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor("Estimates", {
      header: () => "Estimate (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor((row) => row["Std.Error"], {
      id: "stderror",
      header: () => "Standard Error (%)",
      cell: (info) => info.renderValue(),
    }),
  ];
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
    [results]
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
              downloadTable(
                coefMemo,
                Object.keys(coefMemo[0]),
                null,
                params,
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

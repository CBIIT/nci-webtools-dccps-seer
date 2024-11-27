"use client";
import { useMemo } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import { downloadTable } from "@/services/xlsx";

export default function ModelEstimates({ data, params, cohortIndex, fitIndex, precision }) {
  const memoData = useMemo(
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
  const columns = [
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

  return (
    <Container fluid>
      <Row className="justify-content-end">
        <Col sm="auto">
          <Button
            variant="link"
            onClick={() =>
              downloadTable(
                memoData,
                Object.keys(memoData[0]),
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
        <Col className="p-3 border">
          {memoData && (
            <div>
              <h5>Coefficients</h5>
              <Table data={memoData} columns={columns} />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}

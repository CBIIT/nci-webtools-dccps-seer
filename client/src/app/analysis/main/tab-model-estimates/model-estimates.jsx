"use client";
import { useMemo } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import { fetchResults } from "../../queries";

export default function ModelEstimates({ id, cohortIndex, cutpointIndex, fitIndex, cluster }) {
  const file = `${cluster === "cond" ? "cond-" : ""}${cohortIndex}-${
    cutpointIndex ? `${cutpointIndex}-` : ""
  }coefficients`;
  const { data } = useQuery({
    queryKey: ["results", id, file],
    queryFn: () => fetchResults(id, file),
  });
  const memoData = useMemo(() => (data ? data[fitIndex] : []), [data, fitIndex]);
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
      <Row>
        <Col className="p-3 border rounded">
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

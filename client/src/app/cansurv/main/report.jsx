import { Container, Row, Col } from "react-bootstrap";
import { useMemo } from "react";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function Report({ data, precision }) {
  const fit = useMemo(() => {
    return data["fit.list"][0];
  }, [data]);

  const columnHelper = createColumnHelper();
  const columns = [
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
          <Table data={fit.fitlist.estimates} columns={columns} size="sm" />
        </Col>
      </Row>
    </Container>
  );
}

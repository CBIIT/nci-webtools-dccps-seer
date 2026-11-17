"use client";
import { Container, Row, Col } from "react-bootstrap";
import CureModelPlot from "./plot";
import { getCureModelColumns } from "./columns";
import DatasetTable from "@/components/dataset-table";
import { getRecurrenceSettingsRows } from "../download-settings";

export default function CureModel({ data, params, seerData, stratumLabel, precision }) {
  return (
    <Container fluid>
      <Row>
        <Col>
          <CureModelPlot data={data} title="Mixture Cure Model Fit" subtitle={stratumLabel} precision={precision} />
        </Col>
      </Row>
      <DatasetTable
        data={data}
        columns={getCureModelColumns({ precision })}
        filename={`recurrisk-cure-model-${stratumLabel || "data"}`}
        getSettingsRows={() => getRecurrenceSettingsRows(params, seerData, stratumLabel)}
        useColumnHeader
        useSort
        usePagination
        emptyMessage="No data available for this stratum"
      />
    </Container>
  );
}

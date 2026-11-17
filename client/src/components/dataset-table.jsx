"use client";
import { useMemo } from "react";
import { Row, Col, Button } from "react-bootstrap";
import Table from "@/components/table";
import { toTableColumns } from "@/components/column-spec";
import { downloadDataset } from "@/services/xlsx";

/**
 * Table with a "Download Graph Dataset" toolbar; the download uses the same column specs as the table.
 * @param {object} props
 * @param {object[]} props.data
 * @param {object[]} props.columns - column specs (see components/column-spec)
 * @param {string} props.filename
 * @param {() => [string, any][]} props.getSettingsRows - called on download
 * @param {boolean} [props.useColumnHeader]
 */
export default function DatasetTable({ data, columns, filename, getSettingsRows, useColumnHeader = false, ...props }) {
  const tableColumns = useMemo(() => toTableColumns(columns, { useColumnHeader }), [columns, useColumnHeader]);

  return (
    <>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Total Row Count: {data.length}</Col>
        <Col sm="auto">
          <Button
            variant="link"
            onClick={() => downloadDataset(data, columns, getSettingsRows(), filename)}
            disabled={data.length === 0}>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <Table data={data} columns={tableColumns} {...props} />
        </Col>
      </Row>
    </>
  );
}

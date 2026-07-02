import { useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useStore } from "./store";
import { getValueToLabelMap } from "./main/controls";

export default function ReviewDataModal() {
  const setState = useStore((state) => state.setState);
  const openReviewDataModal = useStore((state) => state.openReviewDataModal);
  const seerData = useStore((state) => state.seerData);
  const [displayLines, setDisplayLines] = useState(20);
  const [showLabels, setShowLabels] = useState(true);
  const columnHelper = createColumnHelper();

  const handleClose = () => setState({ openReviewDataModal: false });

  const seerStatData = seerData?.seerStatData || [];
  const seerStatDictionary = seerData?.seerStatDictionary || [];

  const valueToLabelMap = useMemo(() => getValueToLabelMap(seerStatDictionary), [seerStatDictionary]);

  const columns = useMemo(() => {
    if (seerStatDictionary.length) {
      return seerStatDictionary.map((entry) =>
        columnHelper.accessor(entry.name, {
          header: entry.label || entry.name,
          cell: (info) => {
            const raw = info.getValue();
            if (showLabels) {
              const mapped = valueToLabelMap[entry.name]?.[raw];
              if (mapped !== undefined) return mapped;
            }
            return raw;
          },
        })
      );
    }
    if (seerStatData.length) {
      return Object.keys(seerStatData[0]).map((key) =>
        columnHelper.accessor(key, {
          header: key,
          cell: (info) => info.getValue(),
        })
      );
    }
    return [];
  }, [seerStatDictionary, seerStatData, showLabels, valueToLabelMap]);

  const tableData = useMemo(() => seerStatData.slice(0, displayLines), [seerStatData, displayLines]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Modal show={openReviewDataModal} onHide={handleClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Review Data</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light">
        <Row>
          <Col sm="auto">
            <Form.Group className="mb-3" controlId="reviewDisplayLines">
              <Form.Label className="fw-bold">Display Lines</Form.Label>
              <Form.Select value={displayLines} onChange={(e) => setDisplayLines(Number(e.target.value))}>
                {[20, 30, 40, 50, 60].map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Form.Select>
              <Form.Text>Number of lines to preview from data</Form.Text>
            </Form.Group>
          </Col>
          <Col sm="auto" className="d-flex align-items-center">
            <Form.Group controlId="reviewShowLabels">
              <Form.Check
                type="checkbox"
                label="Show Labels"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              <Form.Text>Uncheck to display original values</Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <div className="mb-2">
          Showing {tableData.length} of {seerStatData.length} rows
        </div>
        {tableData.length > 0 ? (
          <div style={{ maxHeight: "400px", overflow: "scroll" }}>
            <Table striped bordered className="mt-1">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="text-muted">No data to display.</div>
        )}
      </Modal.Body>
      <Modal.Footer className="bg-white">
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

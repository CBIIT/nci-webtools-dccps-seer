import { useEffect, useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

function getValueToLabelMap(dictionary) {
  const map = {};
  (dictionary ?? []).forEach((entry) => {
    map[entry.name] = {};
    (entry.factors ?? []).forEach((factor) => {
      map[entry.name][factor.value] = factor.label;
    });
  });
  return map;
}

/**
 * Generic "Review Data" modal for previewing a tabular dataset, optionally with a
 * SEER*Stat-style dictionary used to map coded values to labels.
 *
 * @param {boolean} show
 * @param {() => void} onHide
 * @param {Array<{label: string, data: Array<object>, dictionary?: Array<object>}>} datasets
 */
export default function ReviewDataModal({ show, onHide, datasets = [] }) {
  const [displayLines, setDisplayLines] = useState(20);
  const [showLabels, setShowLabels] = useState(true);
  const [datasetIndex, setDatasetIndex] = useState(0);
  const columnHelper = createColumnHelper();

  // reset the selected dataset if the modal is reopened or the available datasets change
  useEffect(() => {
    if (datasetIndex >= datasets.length) setDatasetIndex(0);
  }, [datasets, datasetIndex]);

  const dataset = datasets[datasetIndex] ?? {};
  const data = dataset.data || [];
  const dictionary = dataset.dictionary || [];

  const valueToLabelMap = useMemo(() => getValueToLabelMap(dictionary), [dictionary]);

  const columns = useMemo(() => {
    if (dictionary.length) {
      return dictionary.map((entry) =>
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
    if (data.length) {
      return Object.keys(data[0]).map((key) =>
        columnHelper.accessor(key, {
          header: key,
          cell: (info) => info.getValue(),
        })
      );
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictionary, data, showLabels, valueToLabelMap]);

  const tableData = useMemo(() => data.slice(0, displayLines), [data, displayLines]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Review Data</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light">
        <Row>
          {datasets.length > 1 && (
            <Col sm="auto">
              <Form.Group className="mb-3" controlId="reviewDataset">
                <Form.Label className="fw-bold">Dataset</Form.Label>
                <Form.Select value={datasetIndex} onChange={(e) => setDatasetIndex(Number(e.target.value))}>
                  {datasets.map((e, i) => (
                    <option key={e.label ?? i} value={i}>
                      {e.label ?? `Dataset ${i + 1}`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          )}
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
          {dictionary.length > 0 && (
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
          )}
        </Row>
        <div className="mb-2">
          Showing {tableData.length} of {data.length} rows
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
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

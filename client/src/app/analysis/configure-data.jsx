import { useMemo, useEffect } from "react";
import { Modal, Button, Form, Container, Row, Col } from "react-bootstrap";
import Table from "react-bootstrap/Table";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { useStore, defaultState } from "./store";
import { parseCsvFile2 } from "@/services/file/file.service";
import { renameKeys } from "@/services/utils";

export default function ConfigureData() {
  const setState = useStore((state) => state.setState);
  const setUserCsv = useStore((state) => state.setUserCsv);
  const openConfigDataModal = useStore((state) => state.userCsv.openConfigDataModal);
  const userData = useStore((state) => state.userCsv.userData);
  const parsedNoHead = useStore((state) => state.userCsv.parsedNoHead);
  const parsedHead = useStore((state) => state.userCsv.parsedHead);
  const form = useStore((state) => state.userCsv.form);
  const setConfigDataModal = (e) => setUserCsv({ openConfigDataModal: e });
  const handleClose = () => setConfigDataModal(false);
  const columnHelper = createColumnHelper();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: form });
  const hasHeaders = watch("hasHeaders");
  const dataType = watch("dataType");

  const headerOptions = [
    { label: "Cohort", value: "cohort", multiple: true },
    { label: "Year of diagnosis", value: "Year" },
    { label: "Interval", value: "Interval" },
    { label: "Number Alive", value: "Alive_at_Start" },
    { label: "Number Dead", value: "Died" },
    { label: "Number Lost", value: "Lost_to_Followup" },
    { label: "Expected Survival Interval", value: "Expected_Survival_Interval" },
    { label: `${dataType} Int`, value: `${dataType.replace(" ", "_")}_Interval` },
    { label: `${dataType} Cum`, value: `${dataType.replace(" ", "_")}_Cum` },
    { label: `${dataType} Int SE`, value: `${dataType.split(" ")[0]}_SE_Interval` },
    { label: `${dataType} Cum SE`, value: `${dataType.split(" ")[0]}_SE_Cum` },
  ];

  useEffect(() => {
    if (userData && hasHeaders) {
      parseCsvFile2(userData, { headers: true }).then((data) => setUserCsv({ parsedHead: data }));
    } else if (userData && !hasHeaders) {
      parseCsvFile2(userData).then((data) => setUserCsv({ parsedNoHead: data }));
    }
  }, [hasHeaders, userData]);

  async function onSubmit(data) {
    const { mapHeaders, ...rest } = data;
    if (hasHeaders) {
      const newHeaders = mapHeaders.reduce((acc, header, index) => {
        acc[parsedHead.headers[index]] =
          header === "cohort" ? `cohort_${parsedHead.headers[index]}` : header || parsedHead.headers[index];
        return acc;
      }, {});
      const seerStatData = parsedHead.data.map((row) => renameKeys(row, newHeaders));
      const headers = Object.values(newHeaders).map((col) => ({
        name: col,
        label: col,
        factors: headerOptions
          .slice(0, 3)
          .map((e) => e.value)
          .some((e) => new RegExp(`^${e}`).test(col))
          ? [...new Set(seerStatData.map((row) => row[col]))].map((value) => ({ value, label: String(value) }))
          : [],
      }));
      const config = { "Session Options": { Statistic: data.dataType, RatesDisplayedAs: data.rates } };
      const cohortVariables = headers.filter((e) => /^cohort/.test(e.name));

      setState({ seerData: { seerStatDictionary: headers, seerStatData, cohortVariables, config } });
    } else {
      const newHeaders = mapHeaders.map((header, index) => header || `col${index}`);
      const reduceData = parsedNoHead.map((row) => ({
        ...row.reduce((acc, cell, index) => {
          let key = newHeaders[index];
          if (acc[key] !== undefined) {
            key = `${key}_${index}`;
          }
          return { ...acc, [key]: cell };
        }, {}),
      }));
      const headers = newHeaders.map((col) => ({
        name: col,
        label: col,
        factors: headerOptions
          .slice(0, 3)
          .map((e) => e.value)
          .includes(col)
          ? [...new Set(reduceData.map((row) => row[col]))].map((value) => ({ value, label: String(value) }))
          : [],
      }));
      const config = { "Session Options": { Statistic: data.dataType, RatesDisplayedAs: data.rates } };
      const cohortVariables = headers.filter((e) => e.name.includes("cohort"));

      setState({ seerData: { seerStatDictionary: headers, seerStatData: reduceData, cohortVariables, config } });
    }
    handleClose();
  }

  function onReset() {
    reset({ ...defaultState.userCsv.form, openConfigDataModal: true });
  }

  const tableData = useMemo(() => {
    if (hasHeaders) {
      return parsedHead.data.slice(0, 10);
    } else {
      return parsedNoHead.length
        ? parsedNoHead.slice(0, 10).map((row) =>
            row.reduce((acc, cell, index) => {
              acc[`col${index}`] = cell;
              return acc;
            }, {})
          )
        : [];
    }
  }, [parsedNoHead, parsedHead.data]);
  const columns = useMemo(() => {
    if (hasHeaders) {
      return parsedHead.headers.map((col) =>
        columnHelper.accessor(col, {
          header: col,
          cell: (info) => info.getValue(),
        })
      );
    } else {
      return tableData.length
        ? Object.keys(tableData[0]).map((col) =>
            columnHelper.accessor(col, {
              header: col,
              cell: (info) => info.getValue(),
            })
          )
        : [];
    }
  }, [tableData, parsedHead.headers]);

  const table = useReactTable({
    data: tableData,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Modal show={openConfigDataModal} onHide={handleClose} fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>Data Configuration</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)} onReset={onReset}>
        <Modal.Body className="bg-light">
          <Container className="w-50" fluid="sm">
            <Form.Group controlId="hasHeaders">
              <Form.Check {...register("hasHeaders")} type="checkbox" label="Data File Contains Headers" />
              <Form.Text>Check this option is your file contains column headers in the first row</Form.Text>
            </Form.Group>
            <Form.Group controlId="dataType">
              <Form.Label className="fw-bold">Data Type</Form.Label>
              <Form.Select {...register("dataType")}>
                <option value="Relative Survival">Relative Survival</option>
                <option value="CauseSpecific Survival">Cause-Specific Survival</option>
              </Form.Select>
            </Form.Group>
            <Form.Group controlId="rates">
              <Form.Label className="fw-bold">Rates</Form.Label>
              <Form.Select {...register("rates")}>
                <option value="percents">Percents</option>
                <option value="proportion">Proportions</option>
              </Form.Select>
            </Form.Group>
          </Container>
          {tableData.length > 0 && (
            <Table striped bordered className="mt-3">
              <thead>
                <tr>
                  {columns.map((col, index) => (
                    <th key={index}>
                      <Form.Select {...register("mapHeaders." + index)}>
                        <option></option>
                        {headerOptions.map((e, i) => (
                          <option key={i} value={e.value}>
                            {e.label}
                          </option>
                        ))}
                      </Form.Select>
                    </th>
                  ))}
                </tr>
                {table.getHeaderGroups().map((headerGroup, hgIndex) => (
                  <tr key={hgIndex + headerGroup.id}>
                    {headerGroup.headers.map((header, hIndex) => (
                      <th key={hgIndex + hIndex + header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rIndex) => (
                  <tr key={rIndex + row.id}>
                    {row.getVisibleCells().map((cell, cIndex) => (
                      <td key={rIndex + cIndex + "td" + cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-white">
          <Button className="" variant="danger" type="reset">
            Reset
          </Button>

          <Button variant="primary" type="submit">
            Save Changes
          </Button>

          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

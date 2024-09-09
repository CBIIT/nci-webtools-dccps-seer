"use client";
import { useMemo } from "react";
import { Container, Row, Col, Table, Form } from "react-bootstrap";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { groupBy } from "lodash";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import SurvYearPlot from "@/components/plots/survYearPlot";

export default function SurvivalVsYear({ data, seerData, params }) {
  const { control, watch } = useForm({ defaultValues: { intervals: [5] } });
  const intervals = watch("intervals");
  const precision = 2;
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const yearStart = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"][0].label;
  const yearEnd = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"].at(-1).label;
  const observedHeader = params?.observed;
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Cum" : "CauseSpecific_SE_Cum";
  const predictedHeader = "pred_cum";
  const predictedSeHeader = "pred_cum_se";
  // const model = useMemo(() => data, [data]);
  const model = useMemo(() => data.filter((e) => intervals.includes(e.Interval)), [data, intervals]);
  const groupByInterval = groupBy(model, "Interval");

  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor(params.year, {
      header: () => "Year of Diagnosis",
      cell: (info) => info.getValue() + yearStart,
    }),
    columnHelper.accessor("Interval", {
      header: () => "Interval",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor(observedHeader, {
      header: () => "Relative Survival Cumulative (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(observedSeHeader, {
      header: () => "Relative Survival Cumulative Std. Err. (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(predictedHeader, {
      header: "Predicted Cumulative Survival (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(predictedSeHeader, {
      header: "Predicted Cumulative Survival Std. Err. (%)",
      cell: (info) => info.renderValue(),
    }),
  ];

  const table = useReactTable({
    data: model,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const plotData = {
    intervals,
    params,
    seerData,
    data,
  };

  return (
    <div>
      <Container fluid>
        <Row className="my-3 py-3 border rounded">
          <Col sm="auto">
            <SelectHookForm
              name="intervals"
              label="Select years since diagnosis (follow-up) for survival plot and/or trend measures"
              // options={[]}
              options={[...new Set(data.map((e) => e.Interval))].map((e) => ({ label: e, value: e }))}
              control={control}
              isMulti
            />
          </Col>
        </Row>
        <Row>
          <Col>
            <SurvYearPlot plotData={plotData} />
          </Col>
        </Row>
      </Container>

      <Table striped bordered>
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
  );
}

"use client";
import { useMemo } from "react";
import { Container, Row, Col, Table, Form } from "react-bootstrap";
import Plot from "react-plotly.js";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { groupBy } from "lodash";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";

export default function SurvivalVsYear({ data, seerData, params }) {
  console.log("data", data);
  console.log("params", params);
  console.log("seerdata", seerData);

  const colors = [
    "#1f77b4", // muted blue
    "#ff7f0e", // safety orange
    "#2ca02c", // cooked asparagus green
    "#d62728", // brick red
    "#9467bd", // muted purple
    "#8c564b", // chestnut brown
    "#e377c2", // raspberry yogurt pink
    "#7f7f7f", // middle gray
    "#bcbd22", // curry yellow-green
    "#17becf", // blue-teal
  ];

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { interval: [5] } });
  const selectedInterval = watch("interval");
  const precision = 2;
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const yearStart = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"][0].label;
  const yearEnd = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"].at(-1).label;
  const observedHeader = params?.observed;
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Cum" : "CauseSpecific_SE_Cum";
  const predictedHeader = "pred_cum";
  const predictedSeHeader = "pred_cum_se";
  // const model = useMemo(() => data, [data]);
  const model = useMemo(() => data.filter((e) => selectedInterval.includes(e.Interval)), [data, selectedInterval]);
  const groupByInterval = groupBy(model, "Interval");

  let observedTraces = [];
  let predictedTraces = [];
  let projectedTraces = [];

  Object.entries(groupByInterval).forEach(([interval, group], i) => {
    let observed = { x: [], y: [], hovertemplate: [] };
    let predicted = { x: [], y: [], hovertemplate: [] };
    let projected = { x: [], y: [], hovertemplate: [] };
    const projectedStart = group.map((e) => e[observedHeader]).length;
    group.forEach((row, i) => {
      observed.x.push(row[params.year] + yearStart);
      observed.y.push(row[observedHeader]);
      observed.hovertemplate.push(
        [
          `<b>${interval}-year ${statistic}</b>`,
          `<br>•    Year at Diagnosis: %{x}`,
          `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`,
        ].join("")
      );

      if (i != projectedStart) {
        predicted.x.push(row[params.year] + yearStart);
        predicted.y.push(row[predictedHeader]);
        predicted.hovertemplate.push(
          [
            `<b>${interval}-year ${statistic}</b>`,
            `<br>•    Year at Diagnosis: %{x}`,
            `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`,
          ].join("")
        );
      } else {
        projected.x.push(row[params.year] + yearStart);
        projected.y.push(row[predictedHeader]);
        projected.hovertemplate.push(
          [
            `<b>${interval}-year ${statistic}</b>`,
            `<br>•    Year at Diagnosis: %{x}`,
            `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`,
          ].join("")
        );
      }
    });

    observedTraces.push({
      x: [],
      y: [],
      hovertemplate: [],
      ...observed,
      showlegend: false,
      hoverlabel: {
        align: "left",
        bgcolor: "#FFF",
        bordercolor: colors[i % 10],
        // font: { size: fontSize, color: "black" },
      },
      mode: "markers",
      type: "scatter",
      marker: { color: colors[i % 10] },
      legendgroup: interval,
    });

    predictedTraces.push({
      x: [],
      y: [],
      hovertemplate: [],
      ...predicted,
      showlegend: false,
      hoverlabel: {
        align: "left",
        bgcolor: "#FFF",
        bordercolor: colors[i % 10],
        // font: { size: fontSize, color: "black" },
      },
      mode: "lines",
      line: { shape: "spline", color: colors[i % 10] },
      type: "scatter",
      legendgroup: interval,
    });

    projectedTraces.push({
      x: [],
      y: [],
      hovertemplate: [],
      ...projected,
      showlegend: false,
      hoverlabel: {
        align: "left",
        bgcolor: "#FFF",
        bordercolor: colors[i % 10],
        // font: { size: fontSize, color: "black" },
      },
      mode: "lines",
      line: { dash: "dash", color: colors[i % 10] },
      type: "scatter",
      legendgroup: interval,
    });
  });
  const layout = {
    title: "titles(statistic, modelInfo)[divID].plotTitle",
    hovermode: "closest",
    font: {
      //   size: fontSize,
      family: "Inter, sans-serif",
    },
    legend: {
      orientation: "h",
      // x: 0.5,
      y: -0.15,
      // yanchor: 'top',
      // xanchor: 'center',
    },
    xaxis: {
      //   title: "<b>" + titles(statistic)[divID].xTitle + "</b>",
      range: [yearStart, yearEnd],
      autorange: false,
    },
    yaxis: {
      //   title: "<b>" + titles(statistic)[divID].yTitle + "</b>",
      showline: true,
      tickformat: "%",
      tickmode: "auto",
      nticks: 11,
      range: [0, 1.05],
      autorange: false,
    },
    height: 700,
    width: 900,
  };

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

  return (
    <div>
      <Container fluid style={{ minHeight: layout.height || 500 }}>
        <Row className="my-3 py-3 border rounded">
          <Col sm="auto">
            <SelectHookForm
              name="interval"
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
            <Plot
              className={`w-100 $`}
              style={{ minHeight: layout.height || 500 }}
              divId={"survival"}
              data={[...observedTraces, ...predictedTraces, ...projectedTraces]}
              layout={layout}
              config={{
                displayModeBar: true,
                responsive: true,
                displaylogo: false,
                toImageButtonOptions: {
                  format: "svg",
                  // filename: filename || divId,
                  scale: 1,
                },
              }}
              useResizeHandler
            />
          </Col>
        </Row>
        <Row className="p-3 d-flex justify-content-end">
          {/* <Col sm="auto">
              <Button
                variant="link"
                onClick={() =>
                  downloadImage(divId, {
                    format: 'png',
                    filename: filename,
                  })
                }
              >
                Download PNG
              </Button>
            </Col>
            <Col sm="auto">
              <Button
                variant="link"
                onClick={() =>
                  downloadImage(divId, {
                    format: 'svg',
                    filename: filename,
                  })
                }
              >
                Download SVG
              </Button>
            </Col> */}
          {/* {originalData && (
          <Col sm="auto">
            <Button
              variant="link"
              className="ml-auto m-0"
              onClick={() => handleSaveCSV(originalData, `${filename || divId}.csv`)}>
              Download Data
            </Button>
          </Col>
        )}
        <Col sm="auto m-1">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() =>
              saveAs(
                new Blob([JSON.stringify({ traces: data, layout })], {
                  type: "application/json",
                }),
                `${filename}.json`
              )
            }>
            Download Plotly Data &gt;
          </Button>
        </Col> */}
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

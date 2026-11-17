"use client";
import { useMemo } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useForm, useWatch } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import SurvTimePlot from "./surv-time-plot";
import DatasetTable from "@/components/dataset-table";
import { getCohortLabel } from "../cohort-select";
import { useStore } from "../../store";
import { getJpsurvSettingsRows } from "../download-settings";
import { getSurvTimeColumns } from "../table-columns";

export default function SurvivalVsTime({ data, seerData, params, cohortIndex, fitIndex, conditional, precision }) {
  const main = useStore((state) => state.main);
  const conditionalIntervals = useStore((state) => state.conditionalIntervals);
  const isRecalcCond = !!conditional;
  const { statistic } = params;
  const observedHeader = isRecalcCond ? "observed" : params?.observed;
  const predictedHeader = isRecalcCond ? "pred_cum" : "Predicted_Survival_Cum";
  const yearOptions = [...new Set((conditional || data).map((e) => e[params.year]))];
  const { control } = useForm({
    defaultValues: { years: [yearOptions[0]] },
  });
  const years = useWatch({ control, name: "years" });
  const memoData = useMemo(
    () => (conditional || data).filter((e) => years.includes(e[params.year])),
    [data, conditional, years, params.year]
  );

  function getSettingsRows() {
    return getJpsurvSettingsRows(
      params,
      seerData,
      { main, conditionalIntervals: isRecalcCond ? conditionalIntervals : null },
      [["Year of Diagnosis (plot)", years.join(", ")]]
    );
  }

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border">
          <Row>
            <Col sm="auto">
              <SelectHookForm
                name="years"
                label={`Year of Diagnosis`}
                options={yearOptions.map((e) => ({
                  label: e,
                  value: e,
                }))}
                control={control}
                isMulti
              />
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvTimePlot
            data={memoData}
            params={params}
            title={`${conditional ? "Conditional " : ""}${statistic} by Diagnosis Year for Selected Diagnosis Year`}
            subtitle={`Joinpoint ${fitIndex} - ${getCohortLabel(params, cohortIndex)}`}
            xTitle={`${isRecalcCond ? "Conditional " : ""}Time Since Diagnosis`}
            yTitle={`${isRecalcCond ? "Conditional " : ""}${statistic}`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
            isRecalcCond={isRecalcCond}
            precision={precision}
          />
        </Col>
      </Row>
      <DatasetTable
        data={memoData}
        columns={getSurvTimeColumns({ params, observedHeader, predictedHeader, isRecalcCond, precision })}
        filename={`survByTime - Model ${fitIndex} - ${cohortIndex}`}
        getSettingsRows={getSettingsRows}
      />
    </Container>
  );
}

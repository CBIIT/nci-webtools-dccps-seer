"use client";
import { useMemo } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import SurvTimePlot from "./surv-time-plot";
import SurvTimeTable from "./surv-time-table";
import { downloadTable } from "@/services/xlsx";

export default function SurvivalVsTime({ data, seerData, params, cohortIndex, fitIndex, conditional, precision }) {
  const isRecalcCond = !!conditional;
  const { statistic } = params;
  const observedHeader = isRecalcCond ? "observed" : params?.observed;
  const predictedHeader = isRecalcCond ? "pred_cum" : "Predicted_Survival_Cum";
  const yearOptions = [...new Set((conditional || data).map((e) => e[params.year]))];
  const { control, register, watch } = useForm({
    defaultValues: { years: [yearOptions[0]] },
  });
  const years = watch("years");
  const memoData = useMemo(() =>
    (conditional || data).filter((e) => years.includes(e[params.year]), [data, conditional, years])
  );

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border">
          <Row>
            <Col sm="auto">
              <SelectHookForm
                name="years"
                label={`${isRecalcCond ? "Conditional " : ""}Year of Diagnosis`}
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
            xTitle={`${isRecalcCond ? "Conditional " : ""}Interval`}
            yTitle={`${isRecalcCond ? "Conditional " : ""}${statistic}`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
            isRecalcCond={isRecalcCond}
            precision={precision}
          />
        </Col>
      </Row>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Rows: {memoData.length}</Col>
        <Col sm="auto">
          <Button
            variant="link"
            onClick={() =>
              downloadTable(
                memoData,
                [...params.cohortVars, params.year, "Interval", observedHeader, predictedHeader],
                seerData,
                params,
                `survByTime - Model ${fitIndex} - ${cohortIndex}`
              )
            }>
            Download Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvTimeTable
            data={memoData}
            params={params}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
            isRecalcCond={isRecalcCond}
            precision={precision}
          />
        </Col>
      </Row>
    </Container>
  );
}

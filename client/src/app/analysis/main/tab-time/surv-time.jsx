"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import SurvTimePlot from "./surv-time-plot";
import SurvTimeTable from "./surv-time-table";

export default function SurvivalVsTime({ data, seerData, params, conditional }) {
  const isRecalcCond = !!conditional;
  const { statistic } = params;
  const observedHeader = isRecalcCond ? "observed" : params?.observed;
  const predictedHeader = "Predicted_Survival_Cum";
  const yearDic = seerData.seerStatDictionary
    .filter((e) => e.name == params.year)[0]
    .factors.reduce((acc, e) => ({ ...acc, [e.value]: +e.label }), {});
  const { control, register, watch } = useForm({
    defaultValues: { years: [0] },
  });
  const years = watch("years");
  const memoData = useMemo(() =>
    (conditional || data).filter((e) => years.includes(e[params.year]), [data, conditional, years])
  );
  const yearOptions = [...new Set((conditional || data).map((e) => yearDic[e[params.year]]))].map((e) => ({
    label: e,
    value: +Object.keys(yearDic).find((key) => yearDic[key] === e),
  }));

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border rounded">
          <Row>
            <Col sm="auto">
              <SelectHookForm
                name="years"
                label={`${isRecalcCond ? "Conditional " : ""}Year of Diagnosis`}
                options={yearOptions}
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
          />
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
          />
        </Col>
      </Row>
    </Container>
  );
}

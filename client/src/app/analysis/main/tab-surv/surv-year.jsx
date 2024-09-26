"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import SurvYearPlot from "./surv-year-plot";
import SurvYearTable from "./surv-year-table";

export default function SurvivalVsYear({ data, seerData, params }) {
  const intervalOptions = [...new Set(data.map((e) => e.Interval))];
  const defaultInterval = intervalOptions.includes(5) ? 5 : Math.max(...intervalOptions);
  const { control, register, watch, setValue } = useForm({
    defaultValues: { intervals: [defaultInterval], trendBetween: false, useRange: false, trendRange: [] },
  });
  const intervals = watch("intervals");
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const memoData = useMemo(() => data.filter((e) => intervals.includes(e.Interval)), [data, intervals]);
  const observedHeader = params?.observed;
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Cum" : "CauseSpecific_SE_Cum";
  const predictedHeader = "pred_cum";
  const predictedSeHeader = "pred_cum_se";

  function handleCheck(e) {
    const { name, value, checked } = e.target;
  }

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border rounded">
          <Row>
            <Col sm="auto">
              <SelectHookForm
                name="intervals"
                label="Select years since diagnosis (follow-up) for survival plot and/or trend measures"
                options={[...new Set(data.map((e) => e.Interval))].map((e) => ({ label: e, value: e }))}
                control={control}
                isMulti
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Group>
                <Form.Label>
                  <b>Include Trend Measures</b>
                </Form.Label>
                <Form.Check
                  {...register("trendBetween")}
                  id="trendBetween"
                  label="Between Joinpoints"
                  aria-label="Between Joinpoints"
                  type="checkbox"
                  onChange={(e) => handleCheck(e)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearPlot
            data={memoData}
            seerData={seerData}
            params={params}
            title={`${statistic} by Diagnosis Year`}
            xTitle={"Year of Diagnosis"}
            yTitle={`${statistic} (%)`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearTable
            data={memoData}
            seerData={seerData}
            params={params}
            observedHeader={observedHeader}
            observedSeHeader={observedSeHeader}
            predictedHeader={predictedHeader}
            predictedSeHeader={predictedSeHeader}
          />
        </Col>
      </Row>
    </Container>
  );
}

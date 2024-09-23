"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import SurvYearPlot from "./surv-year-plot";
import SurvYearTable from "./surv-year-table";

export default function SurvivalVsYear({ data, seerData, params }) {
  const { control, register, watch } = useForm({
    defaultValues: { intervals: [5], trendBetween: false, useRange: false, trendRange: [] },
  });
  const intervals = watch("intervals");
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const memoData = useMemo(() => data.filter((e) => intervals.includes(e.Interval)), [data, intervals]);

  function handleCheck(e) {
    const { name, value, checked } = event.target;

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
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearTable data={memoData} seerData={seerData} params={params} />
        </Col>
      </Row>
    </Container>
  );
}

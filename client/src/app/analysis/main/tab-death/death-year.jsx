"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import DeathYearPlot from "./death-year-plot";
import DeathYearTable from "./death-year-table";
import TrendTable from "./death-trend-table";

export default function DeathVsYear({ data, seerData, params }) {
  const intervalOptions = [...new Set(data.fullpredicted.map((e) => e.Interval))];
  const defaultInterval = intervalOptions.includes(5) ? 5 : Math.max(...intervalOptions);
  const { control, register, watch, setValue } = useForm({
    defaultValues: { intervals: [defaultInterval], trendBetween: false, useRange: false, trendRange: [] },
  });
  const intervals = watch("intervals");
  const trendBetween = watch("trendBetween");
  const observedHeader = params?.observed.includes("Relative")
    ? "Relative_Survival_Interval"
    : "CauseSpecific_Survival_Interval";
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Interval" : "CauseSpecific_SE_Interval";
  const predictedHeader = "pred_int";
  const predictedSeHeader = "pred_int_se";
  const memoData = useMemo(() => {
    const filterInts = data.fullpredicted.filter((e) => intervals.includes(e.Interval));
    return filterInts.map((e) => ({
      ...e,
      [observedHeader]: e[observedHeader] ? 1 - e[observedHeader] : e[observedHeader],
      [predictedHeader]: e[predictedHeader] ? 1 - e[predictedHeader] : e[predictedHeader],
    }));
  }, [data, intervals]);
  const trendData = useMemo(
    () => data.deathTrend.reduce((acc, ar) => [...acc, ...ar], []).filter((e) => intervals.includes(e.interval)),
    [data, intervals]
  );

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border rounded mb-3">
          <Row>
            <Col sm="auto">
              <SelectHookForm
                name="intervals"
                label="Select years since diagnosis (follow-up) for survival plot and/or trend measures"
                options={intervalOptions.map((e) => ({ label: e, value: e }))}
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
                />
              </Form.Group>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col>{trendBetween && <TrendTable data={trendData} seerData={seerData} params={params} />}</Col>
      </Row>
      <Row>
        <Col>
          <DeathYearPlot
            data={memoData}
            seerData={seerData}
            params={params}
            title={"Annual Probability of Dying of Cancer by Diagnosis Year"}
            xTitle={"Year of Diagnosis"}
            yTitle={`Annual Probability of Cancer Death (%)`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <DeathYearTable
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

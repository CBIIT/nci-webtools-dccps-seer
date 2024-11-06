"use client";
import { useMemo, useEffect } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import DeathYearPlot from "./death-year-plot";
import DeathYearTable from "./death-year-table";
import TrendTable from "./death-trend-table";
import { downloadTable } from "@/services/xlsx";

export default function DeathVsYear({ data, seerData, params, cohortIndex, fitIndex, conditional, precision }) {
  const intervalOptions = [...new Set((conditional || data.fullpredicted).map((e) => e.Interval))];
  const defaultInterval = intervalOptions.includes(5) ? 5 : Math.max(...intervalOptions);
  const { control, register, watch, setValue } = useForm({
    defaultValues: { intervals: [defaultInterval], trendJp: false, useRange: false, trendRange: [] },
  });
  const intervals = watch("intervals");
  const trendJp = watch("trendJp");
  const observedHeader = params?.observed.includes("Relative")
    ? "Relative_Survival_Interval"
    : "CauseSpecific_Survival_Interval";
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Interval" : "CauseSpecific_SE_Interval";
  const predictedHeader = "Predicted_Survival_Int";
  const predictedSeHeader = "Predicted_Survival_Int_SE";
  const memoData = useMemo(() => {
    const filterInts = (conditional || data.fullpredicted).filter((e) => intervals.includes(e.Interval));
    return filterInts.map((e) => ({
      ...e,
      [observedHeader]: e[observedHeader] ? (100 - e[observedHeader]).toFixed(precision) : e[observedHeader],
      [predictedHeader]: e[predictedHeader] ? (100 - e[predictedHeader]).toFixed(precision) : e[predictedHeader],
    }));
  }, [data, conditional, intervals]);
  const trendData = useMemo(
    () => data.deathTrend.reduce((acc, ar) => [...acc, ...ar], []).filter((e) => intervals.includes(e.interval)),
    [data, intervals]
  );

  // disable trends for conditional recalculation
  useEffect(() => {
    if (trendJp && !!conditional) setValue("trendJp", false);
  }, [conditional, trendJp]);
  // auto select interval on conditional recalculation switch
  useEffect(() => {
    if (!intervalOptions.includes(intervals)) setValue("intervals", [...intervals, defaultInterval]);
  }, [conditional, defaultInterval]);

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border mb-3">
          <Row className="mb-3">
            <Col sm="auto">
              <SelectHookForm
                name="intervals"
                label="Year of Diagnosis"
                options={intervalOptions.map((e) => ({ label: e, value: e }))}
                control={control}
                isMulti
              />
              <Form.Text className="text-muted">
                <i>Select years since diagnosis (follow-up) for survival plot and/or trend measures</i>
              </Form.Text>
            </Col>
          </Row>
          <Row>
            <Col>
              <b>Include Trend Measures</b>
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Group>
                <Form.Check
                  {...register("trendJp")}
                  id="trendJp"
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
        <Col>{trendJp && <TrendTable data={trendData} params={params} />}</Col>
      </Row>
      <Row>
        <Col>
          <DeathYearPlot
            data={memoData}
            params={params}
            title={`${conditional ? "Conditional " : ""}` + "Annual Probability of Dying of Cancer by Diagnosis Year"}
            xTitle={"Year of Diagnosis"}
            yTitle={`Annual Probability of Cancer Death (%)`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
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
                [
                  ...params.cohortVars,
                  params.year,
                  "Interval",
                  observedHeader,
                  observedSeHeader,
                  predictedHeader,
                  predictedSeHeader,
                ],
                seerData,
                params,
                `deathByYear - Model ${fitIndex} - ${cohortIndex}`
              )
            }>
            Download Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <DeathYearTable
            data={memoData}
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

"use client";
import { useMemo } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import SurvYearPlot from "@/components/plots/survYearPlot";
import SurvYearTable from "@/components/table/survYearTable";

export default function SurvivalVsYear({ data, seerData, params }) {
  const { control, watch } = useForm({ defaultValues: { intervals: [5] } });
  const intervals = watch("intervals");
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const memoData = useMemo(() => data.filter((e) => intervals.includes(e.Interval)), [data, intervals]);

  const plotData = {
    intervals,
    params,
    seerData,
    memoData,
  };

  return (
    <Container fluid>
      <Row className="my-3 py-3 border rounded">
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
          <SurvYearPlot
            plotData={plotData}
            title={`${statistic} by Diagnosis Year`}
            xTitle={"Year of Diagnosis"}
            yTitle={`${statistic} (%)`}
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearTable data={memoData} seerData={seerData} params={params} intervals={intervals} />
        </Col>
      </Row>
    </Container>
  );
}

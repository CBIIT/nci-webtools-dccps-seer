"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import DeviancePlot from "./plot";
import DevianceTable from "./table";
import { downloadTable } from "@/services/xlsx";

export default function Deviance({ data, seerData, params, precision }) {
  const { register, watch } = useForm({
    defaultValues: { stratum: 0 },
  });
  const formState = watch();
  const stratumOptions = useMemo(
    () =>
      data["fit.list.by"]?.length
        ? data["fit.list.by"].map((e, index) => ({
            label: Object.entries(e)
              .reduce(
                (acc, [name, value]) => [
                  ...acc,
                  seerData.cohortVariables.filter((e) => e.name === name)[0].factors.filter((e) => e.value === value)[0]
                    .label,
                ],
                []
              )
              .join(" / "),
            value: index,
          }))
        : [],
    [data]
  );

  const memoData = useMemo(() => {
    const { stratum } = formState;
    return data["fit.list"][stratum].data;
  }, [data, formState]);

  const valueToLabelMap = useMemo(() => {
    const map = { stratum: {}, ...Object.fromEntries(seerData.cohortVariables.map((e) => [e.name, {}])) };
    stratumOptions.forEach((option) => {
      map["stratum"][option.value] = option.label;
    });
    seerData.cohortVariables.forEach((varObj) => {
      varObj.factors.forEach((factor) => {
        map[varObj.name][factor.value] = factor.label;
      });
    });
    return map;
  }, [seerData]);

  function getPlotSubtitle() {
    const { stratum } = formState;
    let subtitle = `${stratumOptions.length ? valueToLabelMap.stratum[stratum] : ""}`;
    return subtitle;
  }

  return (
    <Container fluid>
      <Row className="border-bottom mb-3">
        <Col className="p-3">
          {stratumOptions.length > 0 && (
            <Row className="mb-3">
              <Col sm="auto">
                <Form.Group controlId="stratum">
                  <Form.Label>Stratum</Form.Label>
                  <Form.Select {...register("stratum", { valueAsNumber: true })}>
                    {stratumOptions.map((e) => (
                      <option key={e.label} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          )}
        </Col>
      </Row>
      <Row>
        <Col>
          <DeviancePlot
            data={memoData}
            params={params}
            title={`Plot of Deviance Residuals`}
            subtitle={getPlotSubtitle()}
            xTitle={"Interval"}
            yTitle={"Deviance Residuals"}
            precision={precision}
          />
        </Col>
      </Row>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Total Row Count: {memoData.length}</Col>
        <Col sm="auto">
          {/* <Button
            variant="link"
            onClick={() =>
              downloadTable(
                memoData,
                ["Interval", ".Surv.Est", ".Surv.Act", ".Cure.Fraction"],
                seerData,
                params,
                getPlotSubtitle()
              )
            }>
            Download Graph Dataset
          </Button> */}
        </Col>
      </Row>
      <Row>
        <Col>
          <DevianceTable data={memoData} seerData={seerData} valueToLabelMap={valueToLabelMap} precision={precision} />
        </Col>
      </Row>
    </Container>
  );
}

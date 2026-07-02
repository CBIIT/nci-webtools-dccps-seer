"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import ActuarialPlot from "./plot";
import ActuarialTable from "./table";
import { getValueToLabelMap } from "../controls";
import { downloadTableCansurv } from "@/services/xlsx";

export default function Actuarial({ data, seerData, params, precision, stratumIndex = 0, stratumValueToLabel = {} }) {
  const { register, watch } = useForm({
    defaultValues: useMemo(() => {
      const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
      return seerData.cohortVariables
        .filter((e) => !stratum.includes(e.name))
        .reduce((acc, e) => {
          acc[e.name] = 0;
          return acc;
        }, {});
    }, [data, seerData]),
  });
  const formState = watch();
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const hasStrata = data["fit.list.by"]?.length > 0;

  const subStratumVars = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    return seerData.cohortVariables.filter((e) => !stratum.includes(e.name));
  }, [data]);

  const memoData = useMemo(() => {
    const fit = data["fit.list"][stratumIndex]?.data ?? [];
    return fit.filter((item) => {
      return Object.entries(formState).every(([key, value]) => item[key] == value);
    });
  }, [data, formState, stratumIndex]);

  const valueToLabelMap = useMemo(
    () => getValueToLabelMap(subStratumVars, stratumValueToLabel),
    [subStratumVars, stratumValueToLabel]
  );

  function getPlotSubtitle() {
    let subtitle = `${hasStrata ? (valueToLabelMap.stratum[stratumIndex] ?? "") + " / " : ""}`;
    const subs = formState;
    Object.entries(subs).forEach(
      ([key, value], i) =>
        (subtitle += `${valueToLabelMap[key][value]}${i < Object.keys(subs).length - 1 ? " / " : ""}`)
    );
    return subtitle;
  }

  return (
    <Container fluid>
      <Row className="border-bottom mb-3">
        <Col className="p-3">
          <Row>
            {subStratumVars.map((e) => (
              <Col key={e.name} sm="auto">
                <Form.Group controlId={e.name}>
                  <Form.Label>{e.label}</Form.Label>
                  <Form.Select {...register(e.name, { valueAsNumber: true })}>
                    {e.factors.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
      <Row>
        <Col>
          <ActuarialPlot
            data={memoData}
            params={params}
            title={`Comparison of Estimated and Actuarial Survival`}
            subtitle={getPlotSubtitle()}
            xTitle={"Time Since Diagnosis"}
            yTitle={`${statistic}`}
            precision={precision}
          />
        </Col>
      </Row>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Total Row Count: {memoData.length}</Col>
        <Col sm="auto">
          <Button
            variant="link"
            onClick={() =>
              downloadTableCansurv(memoData, Object.keys(memoData[0]), params, `EstAct-${getPlotSubtitle()}`)
            }>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <ActuarialTable
            data={memoData}
            formState={formState}
            seerData={seerData}
            valueToLabelMap={valueToLabelMap}
            precision={precision}
            stratumIndex={stratumIndex}
          />
        </Col>
      </Row>
    </Container>
  );
}

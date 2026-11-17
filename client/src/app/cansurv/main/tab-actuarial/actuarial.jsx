"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form, Spinner } from "react-bootstrap";
import { useForm, useWatch } from "react-hook-form";
import ActuarialPlot from "./plot";
import { getValueToLabelMap } from "../controls";
import { getActuarialColumns } from "../table-columns";
import DatasetTable from "@/components/dataset-table";
import { getCansurvSettingsRows, getSubStratumRows } from "../download-settings";

export default function Actuarial({ data, seerData, params, precision, stratumIndex = 0, stratumValueToLabel = {} }) {
  const { register, control } = useForm({
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
  const formState = useWatch({ control });
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const hasStrata = data["fit.list.by"]?.length > 0;

  const subStratumVars = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    return seerData.cohortVariables.filter((e) => !stratum.includes(e.name));
  }, [data, seerData.cohortVariables]);

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

  function getSettingsRows() {
    const stratumLabel = hasStrata ? valueToLabelMap.stratum[stratumIndex] : "";
    return getCansurvSettingsRows(
      params,
      seerData,
      stratumLabel,
      getSubStratumRows(formState, seerData, valueToLabelMap)
    );
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
      <DatasetTable
        data={memoData}
        columns={getActuarialColumns({ data: memoData, formState, seerData, valueToLabelMap, precision, stratumIndex })}
        filename={`EstAct-${getPlotSubtitle()}`}
        getSettingsRows={getSettingsRows}
      />
    </Container>
  );
}

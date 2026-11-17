"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form, Alert } from "react-bootstrap";
import { useForm, useWatch } from "react-hook-form";
import KYearPlot from "./plot";
import { getValueToLabelMap } from "../controls";
import { getKYearColumns } from "../table-columns";
import DatasetTable from "@/components/dataset-table";
import { getCansurvSettingsRows, getSubStratumRows } from "../download-settings";

export default function KYear({ data, params, seerData, precision, stratumIndex = 0, stratumValueToLabel = {} }) {
  const defaultValues = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    const subs = seerData.cohortVariables
      .filter((e) => !stratum.includes(e.name))
      .reduce((acc, e) => {
        acc[e.name] = 0;
        return acc;
      }, {});
    return { k: 1, xAxisVar: Object.keys(subs)[0], ...subs };
  }, [data, seerData]);

  const { register, control } = useForm({ defaultValues });
  const formState = useWatch({ control });
  const hasStrata = data["fit.list.by"]?.length > 0;

  const valueToLabelMap = useMemo(
    () => getValueToLabelMap(seerData.cohortVariables, stratumValueToLabel),
    [seerData.cohortVariables, stratumValueToLabel]
  );

  const kOptions = useMemo(() => {
    const fit = data["fit.list"][stratumIndex]?.data ?? [];
    return [...new Set(fit.map((e) => e.Interval))].map((e) => ({ label: e, value: e }));
  }, [data, stratumIndex]);

  const xAxisOptions = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    return seerData.cohortVariables
      .filter((e) => !stratum.includes(e.name))
      .map((e) => ({ label: e.label, value: e.name }));
  }, [data, seerData.cohortVariables]);

  const subStratumVars = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    return seerData.cohortVariables.filter((e) => ![...stratum, formState.xAxisVar].includes(e.name));
  }, [data, seerData.cohortVariables, formState.xAxisVar]);

  const memoData = useMemo(() => {
    const { k, xAxisVar, [xAxisVar]: _, ...subStratum } = formState;
    const fit = data["fit.list"][stratumIndex]?.data ?? [];
    return fit
      .filter((e) => {
        return Object.entries(subStratum).every(([key, value]) => e[key] == value);
      })
      .filter((e) => e.Interval == k);
  }, [data, formState, stratumIndex]);

  function getPlotSubtitle() {
    const { k, xAxisVar, ...subs } = formState;
    let subtitle = `${hasStrata ? (valueToLabelMap.stratum[stratumIndex] ?? "") + " / " : ""}`;
    Object.entries(subs).forEach(
      ([key, value], i) =>
        (subtitle += `${valueToLabelMap[key][value]}${i < Object.keys(subs).length - 1 ? " / " : ""}`)
    );
    return `${subtitle} / K = ${k}`;
  }

  function getSettingsRows() {
    const { k, xAxisVar, [xAxisVar]: _, ...subStratum } = formState;
    const stratumLabel = hasStrata ? valueToLabelMap.stratum[stratumIndex] : "";
    return getCansurvSettingsRows(params, seerData, stratumLabel, [
      ["K Value", k],
      ["X Axis Variable", xAxisOptions.find((o) => o.value === xAxisVar)?.label ?? xAxisVar],
      ...getSubStratumRows(subStratum, seerData, valueToLabelMap),
    ]);
  }
  return (
    <Container fluid>
      {xAxisOptions.length === 0 ? (
        <Alert variant="info">
          <div>K-Year Survival Unavailable</div>
          <div>All Covariates were configured as Stratum. Unselect at least one covariate to enable this plot</div>
        </Alert>
      ) : (
        <>
          <Row className="border-bottom mb-3">
            <Col className="p-3">
              <Row className="mb-3">
                <Col sm="auto">
                  <Form.Group controlId="k">
                    <Form.Label>K Value</Form.Label>
                    <Form.Select {...register("k", { valueAsNumber: true })}>
                      {kOptions.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col sm="auto">
                  <Form.Group controlId="xAxisVar">
                    <Form.Label>X Axis Variable</Form.Label>
                    <Form.Select {...register("xAxisVar")}>
                      {xAxisOptions.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
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
              <KYearPlot
                data={memoData}
                xAxisVar={formState.xAxisVar}
                valueToLabelMap={valueToLabelMap}
                title={`Plot of ${formState.k}-Year Survival by Covariate`}
                subtitle={getPlotSubtitle()}
                xTitle={xAxisOptions.filter((e) => e.value === formState.xAxisVar)[0].label}
                yTitle={"Relative Survival"}
                precision={precision}
              />
            </Col>
          </Row>
          <DatasetTable
            data={memoData}
            columns={getKYearColumns({ seerData, valueToLabelMap, precision })}
            filename={`kYear-${getPlotSubtitle()}`}
            getSettingsRows={getSettingsRows}
          />
        </>
      )}
    </Container>
  );
}

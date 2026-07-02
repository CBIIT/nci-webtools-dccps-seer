"use client";
import { useMemo } from "react";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { CiCircleQuestion } from "react-icons/ci";
import { useStore } from "../store";

// Build display options for the Stratum select from the fit list metadata.
// Returns [{ label: "Male / White", value: 0 }, ...] — value is the index into data["fit.list"].
export function getStratumOptions(results, seerData) {
  const fitListBy = results?.["fit.list.by"];
  const cohortVariables = seerData?.cohortVariables;
  if (!fitListBy?.length || !cohortVariables) return [];
  return fitListBy.map((e, index) => ({
    label: Object.entries(e)
      .map(
        ([name, value]) => cohortVariables.find((c) => c.name === name)?.factors.find((f) => f.value == value)?.label
      )
      .join(" / "),
    value: index,
  }));
}

// Build a { [stratumIndex]: label } lookup used by tabs to render plot subtitles.
export function getStratumValueToLabel(results, seerData) {
  return Object.fromEntries(getStratumOptions(results, seerData).map((o) => [o.value, o.label]));
}

export function Controls({ manifest, results, seerData, className, handleSaveResults }) {
  const setState = useStore((state) => state.setState);
  const main = useStore((state) => state.main);
  const id = useStore((state) => state.params.id);
  const { precision, stratumIndex } = main;
  const errors = typeof manifest === "string" ? [manifest] : [];

  const stratumOptions = useMemo(() => getStratumOptions(results, seerData), [results, seerData]);

  function handlePrecisionChange(e) {
    setState({ main: { ...main, precision: +e.target.value } });
  }

  function handleStratumChange(e) {
    setState({ main: { ...main, stratumIndex: +e.target.value } });
  }

  async function handleSaveWorkspace() {
    const response = await fetch(`/api/export/${id}`);
    if (!response.ok) {
      throw new Error("Error during workspace export");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cansurv-${id}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <Form className={className}>
      {errors.length > 0 && (
        <Alert variant="warning" dismissible>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Row>
        {stratumOptions.length > 0 && (
          <Col sm="auto">
            <Form.Group controlId="stratum">
              <Form.Label>Stratum</Form.Label>
              <Form.Select value={stratumIndex} onChange={handleStratumChange}>
                {stratumOptions.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        )}
        <Col sm="auto">
          <Form.Group controlId="precision">
            <Form.Label>
              Precision{" "}
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="precision-tooltip">Number of decimal places in data</Tooltip>}>
                <span>
                  <CiCircleQuestion />
                </span>
              </OverlayTrigger>
            </Form.Label>
            <Form.Select value={precision} onChange={handlePrecisionChange}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((e, i) => (
                <option key={i} value={e}>
                  {e}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col />
        {/* <Col sm="auto">
          <Button variant="link" onClick={handleSaveResults}>
            Download Full Dataset
          </Button>
        </Col> */}
        <Col sm="auto">
          <Button variant="link" onClick={handleSaveWorkspace}>
            Export Workspace
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

"use client";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useStore } from "../store";

export default function CohortSelect({ params }) {
  const setState = useStore((state) => state.setState);
  const { cohortIndex, ...rest } = useStore((state) => state.main);

  function handleCohortChange(e) {
    setState({ main: { ...rest, cohortIndex: e.target.value } });
  }
  return (
    <Form>
      <Form.Group as={Row}>
        <Form.Label column sm="auto">
          Cohort
        </Form.Label>
        <Col sm="auto">
          <Form.Select value={cohortIndex} onChange={handleCohortChange}>
            {params.cohortCombos.map((cohortIndices, comboIndex) => (
              <option key={comboIndex} value={comboIndex + 1}>
                {cohortIndices.map((c, i) => params.cohorts[i].options[c].label.replace(/"/gi, "").trim()).join(" + ")}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Form.Group>
    </Form>
  );
}

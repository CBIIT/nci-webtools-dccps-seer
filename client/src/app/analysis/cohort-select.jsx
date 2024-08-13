"use client";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useStore } from "./store";

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
            {params.cohortCombos.map((e, i) => (
              <option value={i + 1}>{e.join(" + ")}</option>
            ))}
          </Form.Select>
        </Col>
      </Form.Group>
    </Form>
  );
}

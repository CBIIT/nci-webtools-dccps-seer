"use client";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import { useStore } from "../store";

export function Controls({ manifest, className, handleSaveResults }) {
  const setState = useStore((state) => state.setState);
  const main = useStore((state) => state.main);
  const id = useStore((state) => state.params.id);
  const { precision } = main;
  const errors = typeof manifest === "string" ? [manifest] : [];
  
  function handlePrecisionChange(e) {
    setState({ main: { ...main, precision: +e.target.value } });
  }

  async function handleSaveWorkspace() {
    const response = await fetch(`api/export/${id}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
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
    <Form className={"mb-3 " + className}>
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
        <Col sm="auto">
          <Form.Group controlId="precision">
            <Form.Label>Number of Decimal Places</Form.Label>
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

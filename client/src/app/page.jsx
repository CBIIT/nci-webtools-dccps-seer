"use client";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Table } from "react-bootstrap";

export default function AboutTesting() {
  return (
    <Container className="py-3">
      <article className="shadow p-4 rounded">
        <div>
          <h1 className="text-primary mb-3">About JPSurv</h1>
          <hr />
          <Row>
            <Col xs={12}>
              <div className="mb-2">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
                dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
                ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
                deserunt mollit anim id est laborum.
              </div>
            </Col>
          </Row>
        </div>
      </article>
    </Container>
  );
}

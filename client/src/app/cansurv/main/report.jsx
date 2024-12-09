import { Container, Row, Col } from "react-bootstrap";
export default function Report({ data }) {
  return (
    <Container>
      <div>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </Container>
  );
}

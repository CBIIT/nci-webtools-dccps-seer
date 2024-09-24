"use client";
import dynamic from "next/dynamic";
import { Container, Row, Col } from "react-bootstrap";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
});

export default function SurvivalPlot({ data, layout, config, className }) {
  return (
    <Container fluid style={{ minHeight: layout.height || 500 }} className={className}>
      <Row>
        <Col>
          <Plot
            className={`w-100`}
            style={{ minHeight: layout.height || 500 }}
            data={data}
            layout={layout}
            config={{
              displayModeBar: true,
              responsive: true,
              displaylogo: false,
              toImageButtonOptions: {
                format: "svg",
                // filename: filename || divId,
                scale: 1,
              },
              ...config,
            }}
            useResizeHandler
          />
        </Col>
      </Row>
      <Row className="p-3 d-flex justify-content-end">
        {/* <Col sm="auto">
              <Button
                variant="link"
                onClick={() =>
                  downloadImage(divId, {
                    format: 'png',
                    filename: filename,
                  })
                }
              >
                Download PNG
              </Button>
            </Col>
            <Col sm="auto">
              <Button
                variant="link"
                onClick={() =>
                  downloadImage(divId, {
                    format: 'svg',
                    filename: filename,
                  })
                }
              >
                Download SVG
              </Button>
            </Col> */}
        {/* {originalData && (
          <Col sm="auto">
            <Button
              variant="link"
              className="ml-auto m-0"
              onClick={() => handleSaveCSV(originalData, `${filename || divId}.csv`)}>
              Download Data
            </Button>
          </Col>
        )}
        <Col sm="auto m-1">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() =>
              saveAs(
                new Blob([JSON.stringify({ traces: data, layout })], {
                  type: "application/json",
                }),
                `${filename}.json`
              )
            }>
            Download Plotly Data &gt;
          </Button>
        </Col> */}
      </Row>
    </Container>
  );
}

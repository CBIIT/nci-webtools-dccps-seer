"use client";
import dynamic from "next/dynamic";
import { Container, Row, Col } from "react-bootstrap";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
});

export default function SurvivalPlot({ data, layout, config = {}, removeAnnotation }) {
  return (
    <Container fluid style={{ minHeight: layout.height || 500 }}>
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
              editable: true,
              toImageButtonOptions: {
                format: "svg",
                // filename: filename || divId,
                scale: 1,
              },
              ...config,
            }}
            useResizeHandler
            onClickAnnotation={(data) => {
              if (data.event.button == 2) removeAnnotation(data.index);
            }}
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

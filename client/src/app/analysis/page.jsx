"use client";
import { Suspense } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import AnalysisForm from "./form";
import AnalysisMain from "./main";
import { SidebarContainer, SidebarPanel, MainPanel } from "@/components/sidebar-container";
import { useStore } from "./store";

export default function Analysis() {
  const error = "";
  const { openSidebar, toggleSidebar } = useStore((state) => state);

  return (
    <Container className="py-4">
      <Row>
        <SidebarContainer collapsed={!openSidebar} onCollapsed={toggleSidebar}>
          <SidebarPanel>
            <Col>
              <div className="p-3 border rounded" style={{ minHeight: "400px" }}>
                <Suspense fallback={<strong>Loading</strong>}>
                  <AnalysisForm />
                </Suspense>
              </div>
            </Col>
          </SidebarPanel>
          <MainPanel>
            <Col>
              <div className="p-3 border rounded" style={{ minHeight: "400px" }}>
                <Suspense fallback={<strong>Loading</strong>}>
                  <AnalysisMain />
                </Suspense>
              </div>
              {/* {error && <Alert variant="danger">Results expired</Alert>} */}
              {/* <banner/> */}
              {/* <div className={displayTab === "instructions" ? "d-block" : "d-none"}>
            <Instructions formLimits={formLimits} />
          </div>
          <div className={displayTab === "status" ? "d-block" : "d-none"}>
            <Status />
          </div>
          {status && status.status === "COMPLETED" && <></>} */}
            </Col>
          </MainPanel>
        </SidebarContainer>
      </Row>
    </Container>
  );
}

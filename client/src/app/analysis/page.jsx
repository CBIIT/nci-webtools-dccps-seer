"use client";
import { Suspense } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import AnalysisForm from "./form";
import AnalysisMain from "./main";
import { SidebarContainer, SidebarPanel, MainPanel } from "@/components/sidebar-container";
import { useStore } from "./store";

export default function Analysis({ searchParams }) {
  const { openSidebar, toggleSidebar } = useStore((state) => state);
  const { id } = searchParams;

  return (
    <Container className="py-4">
      <Row>
        <SidebarContainer collapsed={!openSidebar} onCollapsed={toggleSidebar}>
          <SidebarPanel>
            <Col>
              <div className="p-3 border rounded bg-white" style={{ minHeight: "400px" }}>
                <Suspense fallback={<strong>Loading</strong>}>
                  <AnalysisForm id={id} />
                </Suspense>
              </div>
            </Col>
          </SidebarPanel>
          <MainPanel>
            <Col>
              <div className="p-3 border rounded bg-white" style={{ minHeight: "400px" }}>
                <Suspense fallback={<strong>Loading</strong>}>
                  <AnalysisMain id={id} />
                </Suspense>
              </div>
            </Col>
          </MainPanel>
        </SidebarContainer>
      </Row>
    </Container>
  );
}

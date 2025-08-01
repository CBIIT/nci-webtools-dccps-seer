"use client";
import { Suspense, useEffect, use } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import Alert from "react-bootstrap/Alert";
import Loading from "@/components/loading";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import AnalysisForm from "./form";
import AnalysisMain from "./main/main";
import { SidebarContainer, SidebarPanel, MainPanel } from "@/components/sidebar-container";
import ConfigureDataModal from "./configure-data-modal";
import { useStore } from "./store";

export default function Analysis(props) {
  const searchParams = use(props.searchParams);
  const router = useRouter();
  const pathname = usePathname();
  const openSidebar = useStore((state) => state.openSidebar);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const params = useStore((state) => state.params);
  const resetMain = useStore((state) => state.resetMain);
  const { id } = searchParams;

  // reset main state when id changes
  useEffect(() => {
    resetMain();
  }, [id]);

  useEffect(() => {
    if (!id && params.id) router.push(`${pathname}?id=${params.id}`, { shallow: true });
  }, [id, params.id, router, pathname]);

  return (
    <Container className="py-4">
      <Row>
        <SidebarContainer collapsed={!openSidebar} onCollapsed={toggleSidebar}>
          <SidebarPanel>
            <Col>
              <div className="shadow p-3 border rounded bg-white" style={{ minHeight: "400px" }}>
                <ErrorBoundary fallback={<Alert variant="warning">Error loading Form</Alert>}>
                  <Suspense fallback={<Loading />}>
                    <AnalysisForm id={id} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </Col>
          </SidebarPanel>
          <MainPanel>
            <Col>
              <div style={{ minHeight: "400px" }}>
                <ErrorBoundary fallback={<Alert variant="warning">Error loading Main</Alert>}>
                  <Suspense fallback={<Loading />}>
                    <AnalysisMain id={id} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </Col>
          </MainPanel>
        </SidebarContainer>
      </Row>
      <ConfigureDataModal />
    </Container>
  );
}

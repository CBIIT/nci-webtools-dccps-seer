"use client";
import { Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import Alert from "react-bootstrap/Alert";
import Loading from "@/components/loading";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "./form";
import Main from "./main/main";
import { SidebarContainer, SidebarPanel, MainPanel } from "@/components/sidebar-container";
import { useStore } from "./store";

export default function Analysis() {
  const router = useRouter();
  const pathname = usePathname();
  const openSidebar = useStore((state) => state.openSidebar);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const storeId = useStore((state) => state.params.id);
  const resetMain = useStore((state) => state.resetMain);
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  // reset main state when id changes
  useEffect(() => {
    resetMain();
  }, [id]);

  useEffect(() => {
    if (!id && storeId) {
      router.push(`${pathname}?id=${storeId}`, { shallow: true });
    }
  }, [id, storeId, router, pathname]);

  return (
    <Container className="py-4">
      <Row>
        <SidebarContainer collapsed={!openSidebar} onCollapsed={toggleSidebar}>
          <SidebarPanel>
            <Col>
              <div className="shadow p-3 border rounded bg-white" style={{ minHeight: "400px" }}>
                <ErrorBoundary fallback={<Alert variant="warning">Error loading Form</Alert>}>
                  <Suspense fallback={<Loading />}>
                    <Form id={id} />
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
                    <Main id={id} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </Col>
          </MainPanel>
        </SidebarContainer>
      </Row>
    </Container>
  );
}

"use client";
import { Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Loading from "@/components/loading";
import { SidebarContainer, SidebarPanel, MainPanel } from "@/components/sidebar-container";
import GroupDataForm from "./form";
import { useStore } from "./store";

export default function GroupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const openSidebar = useStore((state) => state.openSidebar);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const storeId = useStore((state) => state.params.id);
  const resetMain = useStore((state) => state.resetMain);

  // Reset results panel when session id changes
  useEffect(() => {
    resetMain();
  }, [id]);

  // Restore URL if session id is in store but not in URL
  useEffect(() => {
    if (!id && storeId) router.push(`${pathname}?id=${storeId}`, { shallow: true });
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
                    <GroupDataForm id={id} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </Col>
          </SidebarPanel>
          <MainPanel>
            <Col>
              <div style={{ minHeight: "400px" }}>
                <p className="text-muted fst-italic mt-3">Results will appear here after submission.</p>
              </div>
            </Col>
          </MainPanel>
        </SidebarContainer>
      </Row>
    </Container>
  );
}

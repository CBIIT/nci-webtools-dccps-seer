import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainPanel, SidebarContainer, SidebarPanel } from "./sidebar-container";
import { useStore } from "@/app/recurrence/store";

function ToolLayout({ sidebarClassName }) {
  const openSidebar = useStore((state) => state.openSidebar);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  return (
    <SidebarContainer collapsed={!openSidebar} onCollapsed={toggleSidebar}>
      <SidebarPanel className={sidebarClassName}>
        <form aria-label="Analysis form" />
      </SidebarPanel>
      <MainPanel>
        <section aria-label="Results" />
      </MainPanel>
    </SidebarContainer>
  );
}

beforeEach(() => {
  useStore.setState({ openSidebar: true });
});

describe("SidebarContainer", () => {
  it("shows the configuration panel beside the results by default", () => {
    render(<ToolLayout />);

    expect(screen.getByTestId("SidebarPanel")).toHaveClass("col-xl-3");
    expect(screen.getByTestId("SidebarPanel")).toContainElement(screen.getByRole("form", { name: "Analysis form" }));
    expect(screen.getByTestId("MainPanel")).toHaveClass("col-xl-9");
    expect(screen.getByTestId("MainPanel")).toContainElement(screen.getByRole("region", { name: "Results" }));
  });

  it("hides and restores the configuration panel with the toggle", async () => {
    const user = userEvent.setup();
    render(<ToolLayout />);

    await user.click(screen.getByTitle("Hide Configuration Panel"));

    expect(useStore.getState().openSidebar).toBe(false);
    expect(screen.getByTestId("SidebarPanel")).toHaveClass("d-none");
    expect(screen.getByTestId("MainPanel")).toHaveClass("col-md");
    expect(screen.getByTestId("MainPanel")).not.toHaveClass("col-xl-9");

    await user.click(screen.getByTitle("Show Configuration Panel"));

    expect(useStore.getState().openSidebar).toBe(true);
    expect(screen.getByTestId("SidebarPanel")).toHaveClass("col-xl-3");
    expect(screen.getByTestId("MainPanel")).toHaveClass("col-xl-9");
  });

  it("uses a panel's own column class when one is given", () => {
    render(<ToolLayout sidebarClassName="col-xl-4" />);

    expect(screen.getByTestId("SidebarPanel")).toHaveClass("col-xl-4");
    expect(screen.getByTestId("SidebarPanel")).not.toHaveClass("col-xl-3");
  });
});

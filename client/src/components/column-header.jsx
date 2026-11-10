"use client";
import { useId } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

// Table column header label with an optional hover/focus tooltip showing the
// column's definition. Shared by the recurrence Results table and the
// Net Metastatic Recurrence Risk table.
export default function ColumnHeader({ label, definition }) {
  const id = useId();

  if (!definition) {
    return (
      <div className="mx-2" style={{ whiteSpace: "normal" }}>
        {label}
      </div>
    );
  }
  return (
    <OverlayTrigger
      placement="top"
      trigger={["hover", "focus"]}
      overlay={
        <Tooltip id={`column-header-tooltip-${id}`} style={{ "--bs-tooltip-max-width": "28rem" }}>
          {definition}
        </Tooltip>
      }>
      <div tabIndex="0" className="mx-2" style={{ whiteSpace: "normal" }}>
        {label}
      </div>
    </OverlayTrigger>
  );
}

import Spinner from "react-bootstrap/Spinner";

export default function LoadingOverlay({ isVisible, message = "Loading..." }) {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}>
      <Spinner animation="border" size="lg" />
      <div className="mt-2 fw-bold">{message}</div>
    </div>
  );
}

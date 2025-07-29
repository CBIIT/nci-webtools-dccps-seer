import Spinner from "react-bootstrap/Spinner";

export default function Loading({ message }) {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="shadow border rounded bg-white p-3 loader text-center">
      <Spinner variant="primary" animation="border" role="status" />
      <div>{message || "Loading"}</div>
    </div>
  );
}

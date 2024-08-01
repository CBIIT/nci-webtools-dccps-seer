import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function AnalysisMain({ id }) {
  const status = useQuery({
    queryKey: ["status", id],
    queryFn: async () => {
      return (await axios.get(`/api/data/output/${id}/status.json`)).data;
    },
    enabled: !!id,
  });

  return (
    <div>
      <code>{JSON.stringify(status)}</code>
    </div>
  );
}

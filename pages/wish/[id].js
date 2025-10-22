import useSWR from "swr";
import { fetcher } from "../../lib/fetcher";

export default function WishDetails({ wishId }) {
  // Poll every 5 seconds
  const { data, error, isLoading } = useSWR(
    `/api/wishes/${wishId}`, 
    fetcher, 
    { refreshInterval: 5000 }
  );

  if (isLoading) return <p>Loading wish details...</p>;
  if (error) return <p>Error loading wish data.</p>;

  const { title, totalRaised, targetAmount, payments } = data;

  return (
    <div>
      <h1>{title}</h1>
      <p>Raised: ${totalRaised} / ${targetAmount}</p>

      <h2>Recent Donations</h2>
      <ul>
        {payments.map((p) => (
          <li key={p.id}>
            {p.donor_name} - ${p.amount} - {p.status}
          </li>
        ))}
      </ul>

      {payments.some((p) => p.status === "pending") && (
        <p>Waiting for payment confirmation...</p>
      )}
    </div>
  );
}

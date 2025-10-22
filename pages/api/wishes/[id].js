import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  const { data: wish, error } = await supabase
    .from("wishes")
    .select("id, title, target_amount, payments(id, donor_name, amount, status)")
    .eq("id", id)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const totalRaised = wish.payments
    .filter((p) => p.status === "successful")
    .reduce((acc, p) => acc + Number(p.amount), 0);

  res.status(200).json({ ...wish, totalRaised });
}

import { supabaseAdmin } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const data = req.body;

  try {
    // Only process completed payments
    if (data.payment_status === "finished") {
      const reference = data.order_id;

      // Update payment status in Supabase
      await supabaseAdmin()
        .from("payments")
        .update({ status: "success" })
        .eq("provider_reference", reference);

      return res.status(200).json({ message: "Payment status updated" });
    }

    res.status(200).json({ message: "Event ignored" });
  } catch (err) {
    console.error("NowPayments webhook error:", err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
}

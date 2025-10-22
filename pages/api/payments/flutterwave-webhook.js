import { supabaseAdmin } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.FLW_WEBHOOK_SECRET;

  // Verify the signature
  const signature = req.headers["verif-hash"];
  if (signature !== secret) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const event = req.body;

  try {
    if (event.event === "charge.completed" && event.data.status === "successful") {
      const reference = event.data.tx_ref;

      // Update payment status in Supabase
      await supabaseAdmin()
        .from("payments")
        .update({ status: "success" })
        .eq("provider_reference", reference);

      return res.status(200).json({ message: "Payment status updated" });
    }

    res.status(200).json({ message: "Event ignored" });
  } catch (err) {
    console.error("Flutterwave webhook error:", err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
}

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const signature =
      req.headers["verif-hash"] ||
      req.headers["x-flw-signature"] ||
      req.headers["verif_hash"];

    if (!signature || signature !== process.env.FLW_WEBHOOK_SECRET) {
      console.error("❌ Invalid Flutterwave signature");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const event = req.body;
    if (event?.data?.status === "successful" || event?.event === "payment.completed") {
      const ref = event.data?.tx_ref;
      const paymentId = extractPaymentIdFromTxRef(ref);

      if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });

      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle();

      if (!payment)
        return res.status(404).json({ error: "Payment not found" });

      await supabaseAdmin
        .from("payments")
        .update({
          status: "succeeded",
          provider_charge_id: event.data?.id || event.data?.tx_ref,
        })
        .eq("id", paymentId);

      if (payment.wish_id) {
        await incrementWishAmount(payment.wish_id, payment.amount);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("🔥 Flutterwave Webhook Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

function extractPaymentIdFromTxRef(txRef) {
  if (!txRef) return null;
  const m = txRef.match(/wish_([a-zA-Z0-9-]+)/);
  return m ? m[1] : null;
}

async function incrementWishAmount(wishId, amount) {
  const { data: wish } = await supabaseAdmin
    .from("wishes")
    .select("raised_amount")
    .eq("id", wishId)
    .maybeSingle();

  if (wish) {
    await supabaseAdmin
      .from("wishes")
      .update({
        raised_amount: Number(wish.raised_amount || 0) + Number(amount),
      })
      .eq("id", wishId);
  }
}

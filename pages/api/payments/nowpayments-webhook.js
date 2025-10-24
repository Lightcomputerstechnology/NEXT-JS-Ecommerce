import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const headerKey =
      req.headers["x-api-key"] ||
      req.headers["X-Api-Key"] ||
      req.headers["authorization"];

    if (headerKey && headerKey !== process.env.NOWPAYMENTS_WEBHOOK_KEY) {
      console.warn("❌ Invalid NowPayments webhook secret");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = req.body;
    const status =
      payload?.payment_status || payload?.status || payload?.payment?.status;

    if (["confirmed", "finished", "paid"].includes(status)) {
      const orderId = payload?.order_id || payload?.payment?.order_id;
      const paymentId = orderId;

      if (!paymentId)
        return res.status(400).json({ error: "Missing orderId" });

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
          provider_charge_id: payload.id || payload.payment?.id,
        })
        .eq("id", paymentId);

      if (payment.wish_id) {
        await incrementWishAmount(payment.wish_id, payment.amount);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("🔥 NowPayments Webhook Error:", err);
    return res.status(500).json({ error: err.message });
  }
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

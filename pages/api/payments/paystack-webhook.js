import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const rawBody = JSON.stringify(req.body);
    const sigHeader =
      req.headers["x-paystack-signature"] || req.headers["X-Paystack-Signature"];

    // ✅ Verify Paystack signature
    const computedSig = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (computedSig !== sigHeader) {
      console.warn("❌ Invalid Paystack signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const payload = req.body;
    if (payload?.event === "charge.success" || payload?.event === "transaction.success") {
      const data = payload.data;
      const ref = data?.reference;
      const paymentId = extractPaymentIdFromReference(ref);

      if (!paymentId)
        return res.status(400).json({ error: "Missing payment ID" });

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
          provider_charge_id: data?.id || data?.reference,
        })
        .eq("id", paymentId);

      if (payment.wish_id) {
        await incrementWishAmount(payment.wish_id, payment.amount);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("💥 Paystack Webhook Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

function extractPaymentIdFromReference(ref) {
  if (!ref) return null;
  const m = ref.match(/wish_([a-zA-Z0-9-]+)/);
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

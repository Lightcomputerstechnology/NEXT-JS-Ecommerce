import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const {
    wishId,
    amount,
    donorName,
    donorEmail,
    paymentMethod = "card", // card | bank | crypto
  } = req.body;

  if (!wishId || !amount) {
    return res.status(400).json({ error: "Missing required fields: wishId or amount" });
  }

  try {
    // ✅ Verify that the wish exists
    const { data: wish, error: wishError } = await supabaseAdmin
      .from("wishes")
      .select("id, title")
      .eq("id", wishId)
      .single();

    if (wishError || !wish) {
      return res.status(404).json({ error: "Wish not found" });
    }

    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const reference = `wish_${wishId}_${Date.now()}`;
    let paymentUrl = "";

    // --- Paystack ---
    if (paymentMethod === "card") {
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: donorEmail || "anonymous@wishhoff.com",
          amount: Math.round(Number(amount) * 100),
          currency: "NGN",
          reference,
          callback_url: `${siteUrl}/success?source=paystack&wishId=${wishId}`,
          metadata: { wishId },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
            "Content-Type": "application/json",
          },
        }
      );
      paymentUrl = response.data.data.authorization_url;
    }

    // --- Flutterwave ---
    else if (paymentMethod === "bank") {
      const response = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref: reference,
          amount,
          currency: "USD",
          redirect_url: `${siteUrl}/success?source=flutterwave&wishId=${wishId}`,
          customer: { email: donorEmail || "anonymous@wishhoff.com", name: donorName },
          meta: { wishId },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.FLW_SECRET}`,
            "Content-Type": "application/json",
          },
        }
      );
      paymentUrl = response.data.data.link;
    }

    // --- NowPayments (Crypto) ---
    else if (paymentMethod === "crypto") {
      const response = await axios.post(
        "https://api.nowpayments.io/v1/invoice",
        {
          price_amount: amount,
          price_currency: "usd",
          pay_currency: "usdt",
          order_id: reference,
          order_description: `Donation to "${wish.title}"`,
          success_url: `${siteUrl}/success?source=nowpayments&wishId=${wishId}`,
          cancel_url: `${siteUrl}/cancel?wishId=${wishId}`,
        },
        {
          headers: {
            "x-api-key": process.env.NOWPAYMENTS_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      paymentUrl = response.data.invoice_url;
    }

    // ✅ Log payment as pending
    await supabaseAdmin.from("payments").insert([
      {
        wish_id: wishId,
        donor_name: donorName,
        donor_email: donorEmail,
        method: paymentMethod,
        amount,
        currency: "USD",
        status: "pending",
        provider_reference: reference,
      },
    ]);

    return res.status(200).json({ redirect: paymentUrl, reference });
  } catch (err) {
    console.error("💥 Payment Session Error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to create payment session",
      details: err.response?.data || err.message,
    });
  }
}
// pages/api/payments/nowpayments.js
import axios from "axios";
import { supabaseAdmin } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { amount, email, fullName } = req.body;

  if (!amount || !email || !fullName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1️⃣ Create a unique order reference
    const reference = `crypto_${Date.now()}`;

    // 2️⃣ Create NowPayments invoice
    const response = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: amount,
        price_currency: "usd",
        pay_currency: "usdt",
        order_id: reference,
        order_description: `Donation from ${fullName}`,
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?source=nowpayments&ref=${reference}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel?ref=${reference}`,
      },
      {
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const invoiceData = response.data;

    // 3️⃣ Log payment to Supabase
    const { data: payment, error } = await supabaseAdmin()
      .from("payments")
      .insert([
        {
          donor_name: fullName,
          donor_email: email,
          amount,
          currency: "USD",
          method: "crypto",
          status: "pending",
          provider_reference: reference,
          provider_payment_id: invoiceData.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Failed to log payment" });
    }

    // 4️⃣ Return invoice URL to frontend
    res.status(200).json({ invoice_url: invoiceData.invoice_url, payment });
  } catch (err) {
    console.error("NowPayments API error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to create crypto payment",
      details: err.response?.data || err.message,
    });
  }
}

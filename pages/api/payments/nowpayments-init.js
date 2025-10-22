import axios from "axios";
import { supabaseAdmin } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { donorName, donorEmail, amount, method } = req.body;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const reference = `wish_${Date.now()}`;

  try {
    const response = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: amount,
        price_currency: "USD",
        pay_currency: "USDT",
        order_id: reference,
        order_description: `Donation by ${donorName}`,
        success_url: `${siteUrl}/success?source=nowpayments`,
        cancel_url: `${siteUrl}/cancel`,
      },
      {
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentUrl = response.data.invoice_url || response.data.data?.url;

    // Log in Supabase
    await supabaseAdmin()
      .from("payments")
      .insert([
        {
          donor_name: donorName,
          donor_email: donorEmail,
          method: "crypto",
          amount,
          status: "pending",
          provider_reference: reference,
        },
      ]);

    res.status(200).json({ redirect: paymentUrl });
  } catch (err) {
    console.error("NowPayments init error:", err.response?.data || err.message);
    res.status(500).json({ error: "NowPayments initialization failed" });
  }
}

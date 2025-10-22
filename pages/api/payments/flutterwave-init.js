import axios from "axios";
import { supabaseAdmin } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { donorName, donorEmail, amount, method } = req.body;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;

  try {
    const txRef = `wish_${Date.now()}`;

    // Initialize payment
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: txRef,
        amount,
        currency: "USD",
        redirect_url: `${siteUrl}/success?source=flutterwave`,
        customer: { email: donorEmail, name: donorName },
        meta: { donorName, donorEmail },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentUrl = response.data.data.link;

    // Log in Supabase
    await supabaseAdmin()
      .from("payments")
      .insert([
        {
          donor_name: donorName,
          donor_email: donorEmail,
          method: "bank",
          amount,
          status: "pending",
          provider_reference: txRef,
        },
      ]);

    res.status(200).json({ redirect: paymentUrl });
  } catch (err) {
    console.error("Flutterwave init error:", err.response?.data || err.message);
    res.status(500).json({ error: "Flutterwave initialization failed" });
  }
}

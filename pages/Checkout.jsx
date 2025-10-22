import React, { useState } from 'react';
import { useStateContext } from '../context/StateContext';
import { usePaystackPayment } from "react-paystack";
import axios from "axios";
import { getSession } from 'next-auth/react';

const Checkout = () => {
  const { cartItems, totalPrice } = useStateContext();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card'); // card | bank | crypto

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://wishhoffrichies-fi38.onrender.com";

  const handlePayment = async () => {
    try {
      // 1️⃣ Create payment session in your API
      const response = await axios.post(`${siteUrl}/api/payments/create-session`, {
        wishId: "test-wish", // replace with actual wishId
        amount: totalPrice,
        donorName: fullName || "Anonymous",
        donorEmail: email || "anonymous@example.com",
        paymentMethod,
      });

      const { redirect, reference } = response.data;

      // 2️⃣ Paystack initialization (if card)
      if (paymentMethod === "card") {
        const config = {
          email: email,
          amount: totalPrice * 100,
          publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
          reference
        };

        const initializePayment = usePaystackPayment(config);
        initializePayment(
          () => alert("Payment successful!"),
          () => alert("Payment cancelled")
        );
      }

      // 3️⃣ Redirect to Flutterwave or NowPayments
      else {
        window.location.href = redirect; // browser redirect
      }

    } catch (err) {
      console.error("Payment error:", err.response?.data || err.message);
      alert("Failed to initialize payment. Check console.");
    }
  };

  return (
    <div>
      <center><h1 className='checkout-text'>Checkout</h1></center>

      <div className="row">
        <div className="col-50">
          <div className="billing-info">
            <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
              <h3 className='checkout-text'>Billing Address</h3>
              <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <input type="text" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
              <input type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
              <input type="text" placeholder="State" value={state} onChange={e => setState(e.target.value)} />
              <input type="text" placeholder="Zip" value={zip} onChange={e => setZip(e.target.value)} />

              <h3>Payment Method</h3>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="card">Paystack (Card)</option>
                <option value="bank">Flutterwave (Bank)</option>
                <option value="crypto">NowPayments (Crypto)</option>
              </select>

              <center>
                <button className='btn' type="submit">
                  Pay N{totalPrice}
                </button>
              </center>
            </form>
          </div>
        </div>

        <div className="col-25">
          <div className="price-container">
            <h4 className='checkout-cart-title'>Cart <span className="price">{cartItems.length}</span></h4>
            {cartItems.length > 0 ? cartItems.map(item => (
              <div key={item._id} className='checkout-items-container'>
                <p>{item.name} <span className="price">N{item.price}</span></p>
                <p>Quantity: {item.quantity}</p>
              </div>
            )) : <p>Your cart is empty</p>}
            <hr />
            <p>Total <span className="price"><b>N{totalPrice}</b></span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { destination: '/Login', permanent: false } };
  }
  return { props: { session } };
}

export default Checkout;
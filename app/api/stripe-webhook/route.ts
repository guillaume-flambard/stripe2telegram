import { NextResponse } from "next/server";
import { stripe } from "@/app/lib/stripe";
import { sendToTelegram } from "@/app/lib/telegram";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } }; // Stripe raw body

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") as string;
  const rawBody = await req.arrayBuffer();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(rawBody),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook error", err);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const amount = (session.amount_total ?? 0) / 100;
    const currency = session.currency?.toUpperCase();
    const customer = session.customer_details?.name ?? "Client(e)";
    await sendToTelegram(`💸 *${customer}* vient de payer *${amount} ${currency}*`);
  }

  return NextResponse.json({ received: true });
}
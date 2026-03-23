import { Resend } from "resend";

function getResend() { return new Resend(process.env.RESEND_API_KEY); }

// Prevents injection of user-supplied cart data into email templates
export const escHtml = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildLineItemsHtml(items: any[]): string {
    if (!items.length) return "";
    const rows = items
        .map(item => {
            const unitPrice = Number(item.price || 0);
            const qty = Number(item.quantity || 1);
            const lineTotal = unitPrice * qty;
            const variant = [item.size, item.color, item.stitching]
                .filter(Boolean)
                .map((v: string) => escHtml(v))
                .join(" · ");
            return `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 13px; color: #171717;">
          ${escHtml(item.name || "Item")}
          ${variant ? `<div style="font-size: 11px; color: #737373; margin-top: 2px;">${variant} × ${qty}</div>` : `<div style="font-size: 11px; color: #737373; margin-top: 2px;">× ${qty}</div>`}
        </td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${lineTotal.toFixed(2)}</td>
      </tr>`;
        })
        .join("");

    return `
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; margin: 20px 0 6px;">Items Ordered</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      ${rows}
    </table>`;
}

export async function sendOrderConfirmation(opts: {
    customerEmail: string;
    orderRef: string;
    amount: number;
    bizName: string;
    bizAddress: string;
    items?: any[];
    feeAmount?: number;
    feeLabel?: string;
    setupLink?: string;
    isFirstTimeBuyer?: boolean;
    discountCode?: string;
    discountAmount?: number;
    isPickup?: boolean;
    pickupInstructions?: string;
    pickupAddress?: string;
    pickupPhone?: string;
    pickupWait?: string;
}) {
    if (!process.env.RESEND_API_KEY) return;

    const {
        customerEmail, orderRef, amount, bizName, bizAddress,
        items = [], feeAmount, feeLabel, setupLink, isFirstTimeBuyer,
        discountCode, discountAmount,
        isPickup, pickupInstructions, pickupAddress, pickupPhone, pickupWait,
    } = opts;

    const hasDiscount = discountAmount && discountAmount > 0;
    const hasFee = feeAmount && feeAmount > 0;
    const subtotal = hasFee ? amount - feeAmount! : amount;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

    const discountRow = hasDiscount ? `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${(amount + discountAmount!).toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Discount${discountCode ? ` (${discountCode})` : ""}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; color: #16a34a;">-GH&#8373; ${discountAmount!.toFixed(2)}</td>
      </tr>` : "";

    const feeRow = hasFee ? `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${subtotal.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">${feeLabel || "Service Charge"}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${feeAmount!.toFixed(2)}</td>
      </tr>` : "";

    const firstTimeBuyerBlock = isFirstTimeBuyer && setupLink ? `
    <div style="background: #171717; padding: 28px; margin-bottom: 32px; text-align: center;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #a3a3a3; margin: 0 0 8px;">Welcome to Miss Tokyo</p>
      <p style="font-size: 14px; color: white; margin: 0 0 6px; line-height: 1.6; font-weight: 600;">
        You're now part of the atelier.
      </p>
      <p style="font-size: 13px; color: #d4d4d4; margin: 0 0 20px; line-height: 1.6;">
        Set up your account to track this order and manage future purchases.
      </p>
      <a href="${setupLink}" style="display: inline-block; background: white; color: #171717; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 32px; font-weight: 700;">
        Set Up My Account →
      </a>
    </div>` : setupLink ? `
    <div style="background: #f9f9f9; border: 1px solid #e5e5e5; padding: 20px; margin-bottom: 32px; text-align: center;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #737373; margin: 0 0 12px;">Track Your Order</p>
      <a href="${setupLink}" style="display: inline-block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 28px; font-weight: 600;">
        Set Up Your Password to Track Your Order
      </a>
    </div>` : "";

    const pickupBlock = isPickup && pickupInstructions ? `
    <div style="background: #F7F2EC; padding: 20px; margin-bottom: 28px; border: 1px solid #E8E4DE;">
      <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 12px; color: #171717;">
        📦 Your Pickup Instructions
      </p>
      <p style="font-size: 13px; color: #404040; line-height: 1.7; margin: 0 0 16px; white-space: pre-line;">${pickupInstructions}</p>
      <div style="border-top: 1px solid #DDD8D1; padding-top: 12px; font-size: 12px; color: #525252; line-height: 2;">
        ${pickupAddress ? `<div>📍 ${pickupAddress}</div>` : ""}
        ${pickupPhone ? `<div>📞 ${pickupPhone}</div>` : ""}
        ${pickupWait ? `<div>⏱ Ready in: ${pickupWait}</div>` : ""}
      </div>
    </div>` : "";

    const viewOrderBtn = `
    <a href="${baseUrl}/account/orders" style="display: block; border: 1px solid #e5e5e5; padding: 14px; text-align: center; text-decoration: none; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 32px;">
      View Order Status →
    </a>`;

    await getResend().emails.send({
        from: `${bizName} <${process.env.RESEND_FROM_EMAIL || "no-reply@resend.dev"}>`,
        to: [customerEmail],
        subject: `Order Confirmed — #${orderRef}`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Order Confirmed</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Thank you. Your order has been received.
    </h2>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Order Reference</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${orderRef}</td>
      </tr>
    </table>

    ${buildLineItemsHtml(items)}

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      ${discountRow}
      ${feeRow}
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; font-weight: 700;">Total Paid</td>
        <td style="padding: 12px 0; font-size: 15px; text-align: right; font-weight: 700;">GH&#8373; ${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #15803d; font-weight: 600;">Confirmed</td>
      </tr>
    </table>

    ${pickupBlock}
    ${firstTimeBuyerBlock}
    ${viewOrderBtn}

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      ${isPickup ? "Your order is being prepared for pickup. We will notify you when it is ready for collection. Questions? Reply to this email." : "Your piece is now being prepared with care. We will notify you once it has been dispatched. Questions? Reply to this email."}
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${bizName}${bizAddress ? ` · ${bizAddress.replace(/\n/g, ", ")}` : ""}
      </p>
    </div>
  </div>
</body>
</html>`,
    });
}

module.exports=[70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},24361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},1950,e=>{"use strict";var t=e.i(24389);let r=process.env.SUPABASE_SERVICE_ROLE_KEY;r||console.error("CRITICAL: Service Role Key missing from Process Env");let o=(0,t.createClient)("https://wcygtmcnysbhzgcicocm.supabase.co",r||"",{auth:{autoRefreshToken:!1,persistSession:!1}});e.s(["supabaseAdmin",0,o])},17374,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var o={ActionDidNotRevalidate:function(){return n},ActionDidRevalidateDynamicOnly:function(){return s},ActionDidRevalidateStaticAndDynamic:function(){return a}};for(var i in o)Object.defineProperty(r,i,{enumerable:!0,get:o[i]});let n=0,a=1,s=2},66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},81913,e=>{"use strict";let t="https://api.mnotify.com/api/sms/quick";function r(e,t){return Object.entries(t).reduce((e,[t,r])=>e.replaceAll(`{${t}}`,r),e)}function o(e){let t=e.replace(/\D/g,"").trim();return t.startsWith("233")?"0"+t.slice(3):(t.startsWith("0"),t)}function i(e){return e.trim().replace(/^["']|["']$/g,"")}async function n(e){let r=process.env.MNOTIFY_API_KEY;if(!r)return console.warn("[sms] MNOTIFY_API_KEY not set — SMS skipped."),{ok:!1,error:"MNOTIFY_API_KEY is not set in environment variables"};let n=i(r),a=i(e.sender||process.env.MNOTIFY_SENDER_ID||"MISSTOKYO"),s=(Array.isArray(e.to)?e.to:[e.to]).map(o),p=`${t}?key=${n}`,d={recipient:s,sender:a,message:e.message,is_schedule:!1,schedule_date:""};console.log(`[sms] POST ${t}?key=***`),console.log(`[sms] recipient: ${s.join(",")} sender: "${a}"`);try{let e=await fetch(p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}),t=await e.text();if(console.log(`[sms] HTTP ${e.status}:`,t.slice(0,300)),t.trimStart().startsWith("<!"))return{ok:!1,error:"mNotify returned HTML — check API key or endpoint"};let r={};try{r=JSON.parse(t)}catch{}if(r?.status==="success"||r?.code==="2000")return{ok:!0};let o=r?.message||r?.error||t||`HTTP ${e.status}`;return console.error("[sms] mNotify error:",o),{ok:!1,error:o}}catch(e){return console.error("[sms] Unexpected error:",e),{ok:!1,error:e?.message||"Unknown error"}}}e.s(["injectSmsVars",()=>r,"sendSMS",()=>n])},93595,15865,e=>{"use strict";var t=e.i(1950);function r(e){return null==e?"null":e.replace(/\s*[—–-]\s*/g,"-").trim().toLowerCase()}async function o(e){if(!e.length)return[];let o=[...new Set(e.map(e=>e.productId))],{data:i}=await t.supabaseAdmin.from("products").select("id, inventory_count, track_variant_inventory, is_active, preorder_enabled").in("id",o),n=new Map((i??[]).map(e=>[e.id,e])),a=(i??[]).filter(e=>e.track_variant_inventory).map(e=>e.id),s={};if(a.length>0){let{data:e}=await t.supabaseAdmin.from("product_variants").select("product_id, size, color, stitching, inventory_count").in("product_id",a);for(let t of e??[])s[`${t.product_id}|${r(t.size)}|${r(t.color)}|${r(t.stitching)}`]=t.inventory_count??0}return e.map(e=>{let t,o=n.get(e.productId);return o?(t=o.track_variant_inventory&&e.size?s[`${e.productId}|${r(e.size)}|${r(e.color)}|${r(e.stitching)}`]??0:o.inventory_count??0,{productId:e.productId,variantId:e.variantId??null,available:t,isActive:o.is_active??!0,preorderEnabled:o.preorder_enabled??!1}):{productId:e.productId,variantId:e.variantId,available:0,isActive:!1,preorderEnabled:!1}})}async function i(e,r){let o=r.map(e=>({product_id:e.productId,variant_id:e.variantId??null,quantity:e.quantity})),{error:i}=await t.supabaseAdmin.rpc("fn_reserve_online_stock",{p_order_id:e,p_items:o});if(i)throw Error(i.message)}async function n(e){let{data:r,error:o}=await t.supabaseAdmin.from("online_reservations").delete().eq("order_id",e).select("product_id, variant_id, quantity, expires_at");if(o)throw Error(o.message);if(!r?.length)return!1;let i=new Date;r.some(e=>new Date(e.expires_at)<i)&&console.warn(`[confirmSale] Late webhook for order ${e}: reservation expired but payment confirmed — processing sale`);let n=r.filter(e=>e.variant_id);if(n.length>0){let e=n.map(e=>e.variant_id),{data:r}=await t.supabaseAdmin.from("product_variants").select("id, inventory_count").in("id",e),o=new Map((r??[]).map(e=>[e.id,e.inventory_count??0]));await Promise.all(n.map(e=>t.supabaseAdmin.from("product_variants").update({inventory_count:Math.max(0,(o.get(e.variant_id)??0)-e.quantity)}).eq("id",e.variant_id)))}let a={};for(let e of r)a[e.product_id]=(a[e.product_id]??0)+e.quantity;let s=Object.keys(a),{data:p}=await t.supabaseAdmin.from("products").select("id, inventory_count").in("id",s),d=new Map((p??[]).map(e=>[e.id,e.inventory_count??0]));return await Promise.all(Object.entries(a).map(([e,r])=>t.supabaseAdmin.from("products").update({inventory_count:Math.max(0,(d.get(e)??0)-r)}).eq("id",e))),!0}async function a(e){await t.supabaseAdmin.from("online_reservations").delete().eq("order_id",e)}e.s(["normAttr",()=>r],15865),e.s(["confirmSale",()=>n,"getStockStatus",()=>o,"releaseReservation",()=>a,"reserveStock",()=>i],93595)},11989,e=>{"use strict";var t=e.i(46245);let r=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");async function o(e){if(!process.env.RESEND_API_KEY)return;let{customerEmail:o,orderRef:i,amount:n,bizName:a,bizAddress:s,items:p=[],feeAmount:d,feeLabel:l,setupLink:c,isFirstTimeBuyer:x,discountCode:m,discountAmount:u,isPickup:f,pickupInstructions:g,pickupAddress:y,pickupPhone:b,pickupWait:h}=e,v=u&&u>0,_=d&&d>0,$=p.filter(e=>!e.isPreOrder),w=p.filter(e=>e.isPreOrder),k=_?n-d:n,z=v?`
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${(n+u).toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Discount${m?` (${m})`:""}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; color: #16a34a;">-GH&#8373; ${u.toFixed(2)}</td>
      </tr>`:"",S=_?`
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${k.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">${l||"Service Charge"}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${d.toFixed(2)}</td>
      </tr>`:"",I=x&&c?`
    <div style="background: #171717; padding: 28px; margin-bottom: 32px; text-align: center;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #a3a3a3; margin: 0 0 8px;">Welcome to Miss Tokyo</p>
      <p style="font-size: 14px; color: white; margin: 0 0 6px; line-height: 1.6; font-weight: 600;">
        You're now part of the atelier.
      </p>
      <p style="font-size: 13px; color: #d4d4d4; margin: 0 0 20px; line-height: 1.6;">
        Set up your account to track this order and manage future purchases.
      </p>
      <a href="${c}" style="display: inline-block; background: white; color: #171717; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 32px; font-weight: 700;">
        Set Up My Account →
      </a>
    </div>`:c?`
    <div style="background: #f9f9f9; border: 1px solid #e5e5e5; padding: 20px; margin-bottom: 32px; text-align: center;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #737373; margin: 0 0 12px;">Track Your Order</p>
      <a href="${c}" style="display: inline-block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 28px; font-weight: 600;">
        Set Up Your Password to Track Your Order
      </a>
    </div>`:"",A=f&&g?`
    <div style="background: #F7F2EC; padding: 20px; margin-bottom: 28px; border: 1px solid #E8E4DE;">
      <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 12px; color: #171717;">
        📦 Your Pickup Instructions
      </p>
      <p style="font-size: 13px; color: #404040; line-height: 1.7; margin: 0 0 16px; white-space: pre-line;">${g}</p>
      <div style="border-top: 1px solid #DDD8D1; padding-top: 12px; font-size: 12px; color: #525252; line-height: 2;">
        ${y?`<div>📍 ${y}</div>`:""}
        ${b?`<div>📞 ${b}</div>`:""}
        ${h?`<div>⏱ Ready in: ${h}</div>`:""}
      </div>
    </div>`:"",E=`
    <a href="http://localhost:3000/account/orders" style="display: block; border: 1px solid #e5e5e5; padding: 14px; text-align: center; text-decoration: none; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 32px;">
      View Order Status →
    </a>`;await new t.Resend(process.env.RESEND_API_KEY).emails.send({from:`${a} <${process.env.RESEND_FROM_EMAIL||"orders@info.misstokyo.shop"}>`,to:[o],subject:`Order Confirmed — #${i}`,html:`
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${a}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Order Confirmed</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Thank you. Your order has been received.
    </h2>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Order Reference</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${i}</td>
      </tr>
    </table>

    ${function(e){if(!e.length)return"";let t=e.map(e=>{let t=Number(e.price||0),o=Number(e.quantity||1),i=[e.size,e.color,e.stitching].filter(Boolean).map(e=>r(e)).join(" · ");return`
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 13px; color: #171717;">
          ${r(e.name||"Item")}
          ${i?`<div style="font-size: 11px; color: #737373; margin-top: 2px;">${i} \xd7 ${o}</div>`:`<div style="font-size: 11px; color: #737373; margin-top: 2px;">\xd7 ${o}</div>`}
        </td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${(t*o).toFixed(2)}</td>
      </tr>`}).join("");return`
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; margin: 20px 0 6px;">Items Ordered</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      ${t}
    </table>`}($)}${function(e){if(!e.length)return"";let t=e.map(e=>{let t=Number(e.price||0),o=Number(e.quantity||1),i=[e.size,e.color,e.stitching].filter(Boolean).map(e=>r(e)).join(" · "),n=e.estimatedAvailability?new Date(e.estimatedAvailability).toLocaleDateString("en-GB",{month:"long",year:"numeric"}):"date TBD";return`
      <tr style="border-bottom: 1px solid #fef3c7;">
        <td style="padding: 10px 0; font-size: 13px; color: #171717;">
          ${r(e.name||"Item")}
          ${i?`<div style="font-size: 11px; color: #737373; margin-top: 2px;">${i} \xd7 ${o}</div>`:`<div style="font-size: 11px; color: #737373; margin-top: 2px;">\xd7 ${o}</div>`}
          <div style="font-size: 11px; color: #d97706; margin-top: 2px;">Est. availability: ${n}</div>
        </td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; color: #171717;">GH&#8373; ${(t*o).toFixed(2)}</td>
      </tr>`}).join("");return`
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #d97706; margin: 20px 0 6px; border-top: 1px solid #fef3c7; padding-top: 14px;">Pre-Order Items &mdash; Ships when available</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      ${t}
    </table>`}(w)}

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      ${z}
      ${S}
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; font-weight: 700;">Total Paid</td>
        <td style="padding: 12px 0; font-size: 15px; text-align: right; font-weight: 700;">GH&#8373; ${n.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #15803d; font-weight: 600;">Confirmed</td>
      </tr>
    </table>

    ${A}
    ${I}
    ${E}

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      ${f?"Your order is being prepared for pickup. We will notify you when it is ready for collection. Questions? Reply to this email.":"Your piece is now being prepared with care. We will notify you once it has been dispatched. Questions? Reply to this email."}
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${a}${s?` \xb7 ${s.replace(/\n/g,", ")}`:""}
      </p>
    </div>
  </div>
</body>
</html>`})}e.s(["sendOrderConfirmation",()=>o])},54799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},88947,(e,t,r)=>{t.exports=e.x("stream",()=>require("stream"))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__de0cfd7b._.js.map
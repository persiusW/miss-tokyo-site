module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},1950,e=>{"use strict";var t=e.i(24389);let r=process.env.SUPABASE_SERVICE_ROLE_KEY;r||console.error("CRITICAL: Service Role Key missing from Process Env");let a=(0,t.createClient)("https://wcygtmcnysbhzgcicocm.supabase.co",r||"",{auth:{autoRefreshToken:!1,persistSession:!1}});e.s(["supabaseAdmin",0,a])},17374,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={ActionDidNotRevalidate:function(){return i},ActionDidRevalidateDynamicOnly:function(){return s},ActionDidRevalidateStaticAndDynamic:function(){return o}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let i=0,o=1,s=2},66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},93595,15865,e=>{"use strict";var t=e.i(1950);function r(e){return null==e?"null":e.replace(/\s*[—–-]\s*/g,"-").trim().toLowerCase()}async function a(e){if(!e.length)return[];let a=[...new Set(e.map(e=>e.productId))],{data:n}=await t.supabaseAdmin.from("products").select("id, inventory_count, track_variant_inventory, is_active, preorder_enabled").in("id",a),i=new Map((n??[]).map(e=>[e.id,e])),o=(n??[]).filter(e=>e.track_variant_inventory).map(e=>e.id),s={};if(o.length>0){let{data:e}=await t.supabaseAdmin.from("product_variants").select("product_id, size, color, stitching, inventory_count").in("product_id",o);for(let t of e??[])s[`${t.product_id}|${r(t.size)}|${r(t.color)}|${r(t.stitching)}`]=t.inventory_count??0}return e.map(e=>{let t,a=i.get(e.productId);return a?(t=a.track_variant_inventory&&e.size?s[`${e.productId}|${r(e.size)}|${r(e.color)}|${r(e.stitching)}`]??0:a.inventory_count??0,{productId:e.productId,variantId:e.variantId??null,available:t,isActive:a.is_active??!0,preorderEnabled:a.preorder_enabled??!1}):{productId:e.productId,variantId:e.variantId,available:0,isActive:!1,preorderEnabled:!1}})}async function n(e,r){let a=r.map(e=>({product_id:e.productId,variant_id:e.variantId??null,quantity:e.quantity})),{error:n}=await t.supabaseAdmin.rpc("fn_reserve_online_stock",{p_order_id:e,p_items:a});if(n)throw Error(n.message)}async function i(e){let{data:r,error:a}=await t.supabaseAdmin.from("online_reservations").delete().eq("order_id",e).select("product_id, variant_id, quantity, expires_at");if(a)throw Error(a.message);if(!r?.length)return!1;let n=new Date;r.some(e=>new Date(e.expires_at)<n)&&console.warn(`[confirmSale] Late webhook for order ${e}: reservation expired but payment confirmed — processing sale`);let i=r.filter(e=>e.variant_id);if(i.length>0){let e=i.map(e=>e.variant_id),{data:r}=await t.supabaseAdmin.from("product_variants").select("id, inventory_count").in("id",e),a=new Map((r??[]).map(e=>[e.id,e.inventory_count??0]));await Promise.all(i.map(e=>t.supabaseAdmin.from("product_variants").update({inventory_count:Math.max(0,(a.get(e.variant_id)??0)-e.quantity)}).eq("id",e.variant_id)))}let o={};for(let e of r)o[e.product_id]=(o[e.product_id]??0)+e.quantity;let s=Object.keys(o),{data:d}=await t.supabaseAdmin.from("products").select("id, inventory_count").in("id",s),p=new Map((d??[]).map(e=>[e.id,e.inventory_count??0]));return await Promise.all(Object.entries(o).map(([e,r])=>t.supabaseAdmin.from("products").update({inventory_count:Math.max(0,(p.get(e)??0)-r)}).eq("id",e))),!0}async function o(e){await t.supabaseAdmin.from("online_reservations").delete().eq("order_id",e)}e.s(["normAttr",()=>r],15865),e.s(["confirmSale",()=>i,"getStockStatus",()=>a,"releaseReservation",()=>o,"reserveStock",()=>n],93595)},11989,e=>{"use strict";var t=e.i(46245);let r=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");async function a(e){if(!process.env.RESEND_API_KEY)return;let{customerEmail:a,orderRef:n,amount:i,bizName:o,bizAddress:s,items:d=[],feeAmount:p,feeLabel:l,setupLink:c,isFirstTimeBuyer:u,discountCode:m,discountAmount:f,isPickup:x,pickupInstructions:g,pickupAddress:y,pickupPhone:h,pickupWait:v}=e,b=f&&f>0,_=p&&p>0,w=d.filter(e=>!e.isPreOrder),R=d.filter(e=>e.isPreOrder),E=_?i-p:i,$=b?`
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${(i+f).toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Discount${m?` (${m})`:""}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; color: #16a34a;">-GH&#8373; ${f.toFixed(2)}</td>
      </tr>`:"",A=_?`
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${E.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">${l||"Service Charge"}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${p.toFixed(2)}</td>
      </tr>`:"",k=u&&c?`
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
    </div>`:"",S=x&&g?`
    <div style="background: #F7F2EC; padding: 20px; margin-bottom: 28px; border: 1px solid #E8E4DE;">
      <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 12px; color: #171717;">
        📦 Your Pickup Instructions
      </p>
      <p style="font-size: 13px; color: #404040; line-height: 1.7; margin: 0 0 16px; white-space: pre-line;">${g}</p>
      <div style="border-top: 1px solid #DDD8D1; padding-top: 12px; font-size: 12px; color: #525252; line-height: 2;">
        ${y?`<div>📍 ${y}</div>`:""}
        ${h?`<div>📞 ${h}</div>`:""}
        ${v?`<div>⏱ Ready in: ${v}</div>`:""}
      </div>
    </div>`:"",C=`
    <a href="http://localhost:3000/account/orders" style="display: block; border: 1px solid #e5e5e5; padding: 14px; text-align: center; text-decoration: none; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 32px;">
      View Order Status →
    </a>`;await new t.Resend(process.env.RESEND_API_KEY).emails.send({from:`${o} <${process.env.RESEND_FROM_EMAIL||"orders@info.misstokyo.shop"}>`,to:[a],subject:`Order Confirmed — #${n}`,html:`
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${o}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Order Confirmed</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Thank you. Your order has been received.
    </h2>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Order Reference</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${n}</td>
      </tr>
    </table>

    ${function(e){if(!e.length)return"";let t=e.map(e=>{let t=Number(e.price||0),a=Number(e.quantity||1),n=[e.size,e.color,e.stitching].filter(Boolean).map(e=>r(e)).join(" · ");return`
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 13px; color: #171717;">
          ${r(e.name||"Item")}
          ${n?`<div style="font-size: 11px; color: #737373; margin-top: 2px;">${n} \xd7 ${a}</div>`:`<div style="font-size: 11px; color: #737373; margin-top: 2px;">\xd7 ${a}</div>`}
        </td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${(t*a).toFixed(2)}</td>
      </tr>`}).join("");return`
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; margin: 20px 0 6px;">Items Ordered</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      ${t}
    </table>`}(w)}${function(e){if(!e.length)return"";let t=e.map(e=>{let t=Number(e.price||0),a=Number(e.quantity||1),n=[e.size,e.color,e.stitching].filter(Boolean).map(e=>r(e)).join(" · "),i=e.estimatedAvailability?new Date(e.estimatedAvailability).toLocaleDateString("en-GB",{month:"long",year:"numeric"}):"date TBD";return`
      <tr style="border-bottom: 1px solid #fef3c7;">
        <td style="padding: 10px 0; font-size: 13px; color: #171717;">
          ${r(e.name||"Item")}
          ${n?`<div style="font-size: 11px; color: #737373; margin-top: 2px;">${n} \xd7 ${a}</div>`:`<div style="font-size: 11px; color: #737373; margin-top: 2px;">\xd7 ${a}</div>`}
          <div style="font-size: 11px; color: #d97706; margin-top: 2px;">Est. availability: ${i}</div>
        </td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; color: #171717;">GH&#8373; ${(t*a).toFixed(2)}</td>
      </tr>`}).join("");return`
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #d97706; margin: 20px 0 6px; border-top: 1px solid #fef3c7; padding-top: 14px;">Pre-Order Items &mdash; Ships when available</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      ${t}
    </table>`}(R)}

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      ${$}
      ${A}
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; font-weight: 700;">Total Paid</td>
        <td style="padding: 12px 0; font-size: 15px; text-align: right; font-weight: 700;">GH&#8373; ${i.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #15803d; font-weight: 600;">Confirmed</td>
      </tr>
    </table>

    ${S}
    ${k}
    ${C}

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      ${x?"Your order is being prepared for pickup. We will notify you when it is ready for collection. Questions? Reply to this email.":"Your piece is now being prepared with care. We will notify you once it has been dispatched. Questions? Reply to this email."}
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${o}${s?` \xb7 ${s.replace(/\n/g,", ")}`:""}
      </p>
    </div>
  </div>
</body>
</html>`})}e.s(["sendOrderConfirmation",()=>a])},1783,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),n=e.i(59756),i=e.i(61916),o=e.i(74677),s=e.i(69741),d=e.i(16795),p=e.i(87718),l=e.i(95169),c=e.i(47587),u=e.i(66012),m=e.i(49663),f=e.i(26937),x=e.i(10372),g=e.i(93695);e.i(52474);var y=e.i(5232),h=e.i(89171),v=e.i(65044),b=e.i(1950),_=e.i(93595),w=e.i(11989);let R=process.env.PAYSTACK_SECRET_KEY||"";async function E(e){try{let t=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(e)}`,{headers:{Authorization:`Bearer ${R}`},next:{revalidate:0}}),r=await t.json();if(!r.status||!r.data?.status)return null;return r.data.status}catch{return null}}async function $(e){let t=e.headers.get("Authorization");if(!t||t!==`Bearer ${process.env.CRON_SECRET}`)return h.NextResponse.json({error:"Unauthorized"},{status:401});if(!R)return h.NextResponse.json({error:"PAYSTACK_SECRET_KEY not configured"},{status:500});let r=new Date(Date.now()-3e5).toISOString(),a=new Date(Date.now()-864e5).toISOString(),{data:n,error:i}=await b.supabaseAdmin.from("orders").select("id, created_at, customer_email, customer_name, customer_phone, total_amount, items, customer_metadata, paystack_reference, discount_code, discount_amount, delivery_method, payment_status").or(`payment_status.eq.pending,and(payment_status.eq.processing,created_at.lt.${r})`).not("paystack_reference","is",null).neq("paystack_reference","").neq("paystack_reference","dummy-ref");if(i)return console.error("[sync-payment-status] DB fetch failed:",i.message),h.NextResponse.json({error:i.message},{status:500});let o=n??[],s={success:0,failed:0,abandoned:0,skipped:0,errors:0},{data:d}=await b.supabaseAdmin.from("business_settings").select("business_name, address").eq("id","default").single(),p=d?.business_name||"Miss Tokyo",l=d?.address||"";return await Promise.allSettled(o.map(async e=>{try{let t=await E(e.paystack_reference);if(!t)return void(new Date(e.created_at)<new Date(a)?(await b.supabaseAdmin.from("orders").update({status:"cancelled",payment_status:"cancelled"}).eq("id",e.id).in("payment_status",["pending","processing"]),await (0,_.releaseReservation)(e.id).catch(()=>{}),s.abandoned++):s.skipped++);if("success"===t){let t=e.customer_metadata??{},r=!!t.webhook_email_sent;if(await (0,_.confirmSale)(e.id).catch(t=>console.warn(`[sync-cron] confirmSale no-op for ${e.id}:`,t)),await b.supabaseAdmin.from("orders").update({status:"paid",payment_status:"paid",customer_metadata:{...t,webhook_email_sent:!0,sync_confirmed_at:new Date().toISOString()}}).eq("id",e.id).in("payment_status",["pending","processing"]),!r&&e.customer_email){let t=e.id.substring(0,8).toUpperCase(),r=Number(e.total_amount??0),a=Array.isArray(e.items)?e.items:[];await (0,w.sendOrderConfirmation)({customerEmail:e.customer_email,bizName:p,bizAddress:l,items:a,orderRef:t,amount:r,discountCode:e.discount_code??void 0,discountAmount:Number(e.discount_amount)||void 0}).catch(t=>console.error(`[sync-cron] confirmation email failed for ${e.id}:`,t))}(0,v.revalidateTag)("products","max"),s.success++}else"failed"===t?(await b.supabaseAdmin.from("orders").update({status:"cancelled",payment_status:"cancelled"}).eq("id",e.id).in("payment_status",["pending","processing"]),await (0,_.releaseReservation)(e.id).catch(()=>{}),s.failed++):"abandoned"===t?(await b.supabaseAdmin.from("orders").update({status:"cancelled",payment_status:"cancelled"}).eq("id",e.id).in("payment_status",["pending","processing"]),await (0,_.releaseReservation)(e.id).catch(()=>{}),s.abandoned++):s.skipped++}catch(t){console.error(`[sync-cron] error processing order ${e.id}:`,t),s.errors++}})),console.log(`[sync-payment-status] done — total=${o.length}`,s),h.NextResponse.json({total:o.length,results:s})}e.s(["GET",()=>$,"maxDuration",0,300],27878);var A=e.i(27878);let k=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/cron/sync-payment-status/route",pathname:"/api/cron/sync-payment-status",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/cron/sync-payment-status/route.ts",nextConfigOutput:"",userland:A}),{workAsyncStorage:S,workUnitAsyncStorage:C,serverHooks:z}=k;function O(){return(0,a.patchFetch)({workAsyncStorage:S,workUnitAsyncStorage:C})}async function I(e,t,a){k.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/cron/sync-payment-status/route";h=h.replace(/\/index$/,"")||"/";let v=await k.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!v)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:b,params:_,nextConfig:w,parsedUrl:R,isDraftMode:E,prerenderManifest:$,routerServerContext:A,isOnDemandRevalidate:S,revalidateOnlyGenerated:C,resolvedPathname:z,clientReferenceManifest:O,serverActionsManifest:I}=v,q=(0,s.normalizeAppPath)(h),D=!!($.dynamicRoutes[q]||$.routes[z]),P=async()=>((null==A?void 0:A.render404)?await A.render404(e,t,R,!1):t.end("This page could not be found"),null);if(D&&!E){let e=!!$.routes[z],t=$.dynamicRoutes[q];if(t&&!1===t.fallback&&!e){if(w.experimental.adapterPath)return await P();throw new g.NoFallbackError}}let T=null;!D||k.isDev||E||(T="/index"===(T=z)?"/":T);let N=!0===k.isDev||!D,j=D&&!N;I&&O&&(0,o.setManifestsSingleton)({page:h,clientReferenceManifest:O,serverActionsManifest:I});let H=e.method||"GET",M=(0,i.getTracer)(),U=M.getActiveScopeSpan(),F={params:_,prerenderManifest:$,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:N,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:w.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>k.onRequestError(e,t,a,n,A)},sharedContext:{buildId:b}},K=new d.NodeNextRequest(e),Y=new d.NodeNextResponse(t),B=p.NextRequestAdapter.fromNodeNextRequest(K,(0,p.signalFromNodeResponse)(t));try{let o=async e=>k.handle(B,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=M.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${H} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${h}`)}),s=!!(0,n.getRequestMeta)(e,"minimalMode"),d=async n=>{var i,d;let p=async({previousCacheEntry:r})=>{try{if(!s&&S&&C&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await o(n);e.fetchMetrics=F.renderOpts.fetchMetrics;let d=F.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let p=F.renderOpts.collectedTags;if(!D)return await (0,u.sendResponse)(K,Y,i,F.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(i.headers);p&&(t[x.NEXT_CACHE_TAGS_HEADER]=p),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=x.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,a=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=x.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:y.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await k.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:S})},!1,A),t}},l=await k.handleResponse({req:e,nextConfig:w,cacheKey:T,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:$,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:C,responseGenerator:p,waitUntil:a.waitUntil,isMinimalMode:s});if(!D)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==y.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(d=l.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",S?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),E&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,m.fromNodeOutgoingHttpHeaders)(l.value.headers);return s&&D||g.delete(x.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,f.getCacheControlHeader)(l.cacheControl)),await (0,u.sendResponse)(K,Y,new Response(l.value.body,{headers:g,status:l.value.status||200})),null};U?await d(U):await M.withPropagatedContext(e.headers,()=>M.trace(l.BaseServerSpan.handleRequest,{spanName:`${H} ${h}`,kind:i.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},d))}catch(t){if(t instanceof g.NoFallbackError||await k.onRequestError(e,t,{routerKind:"App Router",routePath:q,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:S})},!1,A),D)throw t;return await (0,u.sendResponse)(K,Y,new Response(null,{status:500})),null}}e.s(["handler",()=>I,"patchFetch",()=>O,"routeModule",()=>k,"serverHooks",()=>z,"workAsyncStorage",()=>S,"workUnitAsyncStorage",()=>C],1783)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__00cc1107._.js.map
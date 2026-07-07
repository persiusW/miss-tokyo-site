module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},1950,e=>{"use strict";var t=e.i(24389);let r=process.env.SUPABASE_SERVICE_ROLE_KEY;r||console.error("CRITICAL: Service Role Key missing from Process Env");let o=(0,t.createClient)("https://wcygtmcnysbhzgcicocm.supabase.co",r||"",{auth:{autoRefreshToken:!1,persistSession:!1}});e.s(["supabaseAdmin",0,o])},17374,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var o={ActionDidNotRevalidate:function(){return n},ActionDidRevalidateDynamicOnly:function(){return a},ActionDidRevalidateStaticAndDynamic:function(){return s}};for(var i in o)Object.defineProperty(r,i,{enumerable:!0,get:o[i]});let n=0,s=1,a=2},66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},81913,e=>{"use strict";let t="https://api.mnotify.com/api/sms/quick";function r(e,t){return Object.entries(t).reduce((e,[t,r])=>e.replaceAll(`{${t}}`,r),e)}function o(e){let t=e.replace(/\D/g,"").trim();return t.startsWith("233")?"0"+t.slice(3):(t.startsWith("0"),t)}function i(e){return e.trim().replace(/^["']|["']$/g,"")}async function n(e){let r=process.env.MNOTIFY_API_KEY;if(!r)return console.warn("[sms] MNOTIFY_API_KEY not set — SMS skipped."),{ok:!1,error:"MNOTIFY_API_KEY is not set in environment variables"};let n=i(r),s=i(e.sender||process.env.MNOTIFY_SENDER_ID||"MISSTOKYO"),a=(Array.isArray(e.to)?e.to:[e.to]).map(o),d=`${t}?key=${n}`,p={recipient:a,sender:s,message:e.message,is_schedule:!1,schedule_date:""};console.log(`[sms] POST ${t}?key=***`),console.log(`[sms] recipient: ${a.join(",")} sender: "${s}"`);try{let e=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)}),t=await e.text();if(console.log(`[sms] HTTP ${e.status}:`,t.slice(0,300)),t.trimStart().startsWith("<!"))return{ok:!1,error:"mNotify returned HTML — check API key or endpoint"};let r={};try{r=JSON.parse(t)}catch{}if(r?.status==="success"||r?.code==="2000")return{ok:!0};let o=r?.message||r?.error||t||`HTTP ${e.status}`;return console.error("[sms] mNotify error:",o),{ok:!1,error:o}}catch(e){return console.error("[sms] Unexpected error:",e),{ok:!1,error:e?.message||"Unknown error"}}}e.s(["injectSmsVars",()=>r,"sendSMS",()=>n])},11989,e=>{"use strict";var t=e.i(46245);let r=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");async function o(e){if(!process.env.RESEND_API_KEY)return;let{customerEmail:o,orderRef:i,amount:n,bizName:s,bizAddress:a,items:d=[],feeAmount:p,feeLabel:l,setupLink:c,isFirstTimeBuyer:u,discountCode:m,discountAmount:x,isPickup:f,pickupInstructions:g,pickupAddress:h,pickupPhone:y,pickupWait:b}=e,v=x&&x>0,w=p&&p>0,R=d.filter(e=>!e.isPreOrder),_=d.filter(e=>e.isPreOrder),$=w?n-p:n,k=v?`
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${(n+x).toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Discount${m?` (${m})`:""}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; color: #16a34a;">-GH&#8373; ${x.toFixed(2)}</td>
      </tr>`:"",E=w?`
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${$.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">${l||"Service Charge"}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${p.toFixed(2)}</td>
      </tr>`:"",S=u&&c?`
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
        ${h?`<div>📍 ${h}</div>`:""}
        ${y?`<div>📞 ${y}</div>`:""}
        ${b?`<div>⏱ Ready in: ${b}</div>`:""}
      </div>
    </div>`:"",C=`
    <a href="http://localhost:3000/account/orders" style="display: block; border: 1px solid #e5e5e5; padding: 14px; text-align: center; text-decoration: none; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 32px;">
      View Order Status →
    </a>`;await new t.Resend(process.env.RESEND_API_KEY).emails.send({from:`${s} <${process.env.RESEND_FROM_EMAIL||"orders@info.misstokyo.shop"}>`,to:[o],subject:`Order Confirmed — #${i}`,html:`
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${s}</h1>
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
    </table>`}(R)}${function(e){if(!e.length)return"";let t=e.map(e=>{let t=Number(e.price||0),o=Number(e.quantity||1),i=[e.size,e.color,e.stitching].filter(Boolean).map(e=>r(e)).join(" · "),n=e.estimatedAvailability?new Date(e.estimatedAvailability).toLocaleDateString("en-GB",{month:"long",year:"numeric"}):"date TBD";return`
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
    </table>`}(_)}

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      ${k}
      ${E}
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
    ${S}
    ${C}

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      ${f?"Your order is being prepared for pickup. We will notify you when it is ready for collection. Questions? Reply to this email.":"Your piece is now being prepared with care. We will notify you once it has been dispatched. Questions? Reply to this email."}
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${s}${a?` \xb7 ${a.replace(/\n/g,", ")}`:""}
      </p>
    </div>
  </div>
</body>
</html>`})}e.s(["sendOrderConfirmation",()=>o])},45142,e=>{"use strict";var t=e.i(47909),r=e.i(74017),o=e.i(96250),i=e.i(59756),n=e.i(61916),s=e.i(74677),a=e.i(69741),d=e.i(16795),p=e.i(87718),l=e.i(95169),c=e.i(47587),u=e.i(66012),m=e.i(49663),x=e.i(26937),f=e.i(10372),g=e.i(93695);e.i(52474);var h=e.i(5232),y=e.i(89171),b=e.i(1950),v=e.i(87530),w=e.i(11989),R=e.i(81913);async function _(e){let t=await (0,v.createClient)(),{data:{user:r}}=await t.auth.getUser();if(!r)return y.NextResponse.json({error:"Unauthorized"},{status:401});let{data:o}=await b.supabaseAdmin.from("profiles").select("role").eq("id",r.id).single();if(!o||!["admin","owner","sales_staff"].includes(o.role))return y.NextResponse.json({error:"Forbidden"},{status:403});let{orderId:i}=await e.json();if(!i)return y.NextResponse.json({error:"orderId is required"},{status:400});let[{data:n},{data:s},{data:a}]=await Promise.all([b.supabaseAdmin.from("orders").select("*").eq("id",i).single(),b.supabaseAdmin.from("business_settings").select("business_name, address, contact").eq("id","default").single(),b.supabaseAdmin.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id","singleton").single()]);if(!n)return y.NextResponse.json({error:"Order not found"},{status:404});if(!n.customer_email)return y.NextResponse.json({error:"Order has no customer email"},{status:400});let d=s?.business_name||"Miss Tokyo",p=s?.address||"",l=n.id.substring(0,8).toUpperCase(),c=Number(n.total_amount),u=n.delivery_method?.toLowerCase().includes("pickup")&&a?.pickup_enabled?{isPickup:!0,pickupInstructions:a?.pickup_instructions||"",pickupAddress:a?.pickup_address||s?.address||"",pickupPhone:a?.pickup_contact_phone||s?.contact||"",pickupWait:a?.pickup_estimated_wait||"24 hours"}:{},m=Array.isArray(n.items)?n.items:[],x=[];try{await (0,w.sendOrderConfirmation)({customerEmail:n.customer_email,orderRef:l,amount:c,bizName:d,bizAddress:p,items:m,discountCode:n.discount_code||void 0,discountAmount:Number(n.discount_amount)||void 0,...u})}catch(e){console.error("[resend-confirmation] email failed:",e),x.push(`Email: ${e?.message||"failed"}`)}if(n.customer_phone)try{let e,{data:t}=await b.supabaseAdmin.from("communication_templates").select("body_text, greeting").eq("channel","sms").eq("event_type","order_confirmed").single(),r=n.customer_name?.split(" ")[0]||"there",o={order_id:l,customer_name:r,amount:`GH₵ ${c.toFixed(2)}`,rider_name:"",rider_phone:""};e=t?.body_text?(t.greeting?(0,R.injectSmsVars)(t.greeting,o)+" ":"")+(0,R.injectSmsVars)(t.body_text,o):`Hi ${r}, your ${d} order #${l} is confirmed! Check your email for your receipt. Thank you!`,await (0,R.sendSMS)({to:n.customer_phone,message:e})}catch(e){console.error("[resend-confirmation] SMS failed:",e),x.push(`SMS: ${e?.message||"failed"}`)}return x.length>0?y.NextResponse.json({success:!1,errors:x},{status:500}):y.NextResponse.json({success:!0})}e.s(["POST",()=>_],49594);var $=e.i(49594);let k=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/orders/resend-confirmation/route",pathname:"/api/admin/orders/resend-confirmation",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/admin/orders/resend-confirmation/route.ts",nextConfigOutput:"",userland:$}),{workAsyncStorage:E,workUnitAsyncStorage:S,serverHooks:A}=k;function C(){return(0,o.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:S})}async function O(e,t,o){k.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/admin/orders/resend-confirmation/route";y=y.replace(/\/index$/,"")||"/";let b=await k.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!b)return t.statusCode=400,t.end("Bad Request"),null==o.waitUntil||o.waitUntil.call(o,Promise.resolve()),null;let{buildId:v,params:w,nextConfig:R,parsedUrl:_,isDraftMode:$,prerenderManifest:E,routerServerContext:S,isOnDemandRevalidate:A,revalidateOnlyGenerated:C,resolvedPathname:O,clientReferenceManifest:N,serverActionsManifest:T}=b,P=(0,a.normalizeAppPath)(y),z=!!(E.dynamicRoutes[P]||E.routes[O]),j=async()=>((null==S?void 0:S.render404)?await S.render404(e,t,_,!1):t.end("This page could not be found"),null);if(z&&!$){let e=!!E.routes[O],t=E.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await j();throw new g.NoFallbackError}}let I=null;!z||k.isDev||$||(I="/index"===(I=O)?"/":I);let D=!0===k.isDev||!z,q=z&&!D;T&&N&&(0,s.setManifestsSingleton)({page:y,clientReferenceManifest:N,serverActionsManifest:T});let H=e.method||"GET",M=(0,n.getTracer)(),F=M.getActiveScopeSpan(),U={params:w,prerenderManifest:E,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:o.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,o,i)=>k.onRequestError(e,t,o,i,S)},sharedContext:{buildId:v}},Y=new d.NodeNextRequest(e),K=new d.NodeNextResponse(t),G=p.NextRequestAdapter.fromNodeNextRequest(Y,(0,p.signalFromNodeResponse)(t));try{let s=async e=>k.handle(G,U).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=M.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let o=r.get("next.route");if(o){let t=`${H} ${o}`;e.setAttributes({"next.route":o,"http.route":o,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${y}`)}),a=!!(0,i.getRequestMeta)(e,"minimalMode"),d=async i=>{var n,d;let p=async({previousCacheEntry:r})=>{try{if(!a&&A&&C&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(i);e.fetchMetrics=U.renderOpts.fetchMetrics;let d=U.renderOpts.pendingWaitUntil;d&&o.waitUntil&&(o.waitUntil(d),d=void 0);let p=U.renderOpts.collectedTags;if(!z)return await (0,u.sendResponse)(Y,K,n,U.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(n.headers);p&&(t[f.NEXT_CACHE_TAGS_HEADER]=p),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==U.renderOpts.collectedRevalidate&&!(U.renderOpts.collectedRevalidate>=f.INFINITE_CACHE)&&U.renderOpts.collectedRevalidate,o=void 0===U.renderOpts.collectedExpire||U.renderOpts.collectedExpire>=f.INFINITE_CACHE?void 0:U.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:o}}}}catch(t){throw(null==r?void 0:r.isStale)&&await k.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:A})},!1,S),t}},l=await k.handleResponse({req:e,nextConfig:R,cacheKey:I,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:E,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:C,responseGenerator:p,waitUntil:o.waitUntil,isMinimalMode:a});if(!z)return null;if((null==l||null==(n=l.value)?void 0:n.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(d=l.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});a||t.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),$&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,m.fromNodeOutgoingHttpHeaders)(l.value.headers);return a&&z||g.delete(f.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,x.getCacheControlHeader)(l.cacheControl)),await (0,u.sendResponse)(Y,K,new Response(l.value.body,{headers:g,status:l.value.status||200})),null};F?await d(F):await M.withPropagatedContext(e.headers,()=>M.trace(l.BaseServerSpan.handleRequest,{spanName:`${H} ${y}`,kind:n.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},d))}catch(t){if(t instanceof g.NoFallbackError||await k.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:A})},!1,S),z)throw t;return await (0,u.sendResponse)(Y,K,new Response(null,{status:500})),null}}e.s(["handler",()=>O,"patchFetch",()=>C,"routeModule",()=>k,"serverHooks",()=>A,"workAsyncStorage",()=>E,"workUnitAsyncStorage",()=>S],45142)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__a8034596._.js.map
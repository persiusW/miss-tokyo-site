module.exports=[87924,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored["react-ssr"].ReactJsxRuntime},38783,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored["react-ssr"].ReactServerDOMTurbopackClient},35112,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored["react-ssr"].ReactDOM},88347,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d,e={ACTION_HMR_REFRESH:function(){return k},ACTION_NAVIGATE:function(){return h},ACTION_REFRESH:function(){return g},ACTION_RESTORE:function(){return i},ACTION_SERVER_ACTION:function(){return l},ACTION_SERVER_PATCH:function(){return j},PrefetchKind:function(){return m}};for(var f in e)Object.defineProperty(c,f,{enumerable:!0,get:e[f]});let g="refresh",h="navigate",i="restore",j="server-patch",k="hmr-refresh",l="server-action";var m=((d={}).AUTO="auto",d.FULL="full",d);("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},67009,(a,b,c)=>{"use strict";function d(a){return null!==a&&"object"==typeof a&&"then"in a&&"function"==typeof a.then}Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"isThenable",{enumerable:!0,get:function(){return d}})},90841,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={dispatchAppRouterAction:function(){return i},useActionQueue:function(){return j}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});let f=a.r(46058)._(a.r(72131)),g=a.r(67009),h=null;function i(a){if(null===h)throw Object.defineProperty(Error("Internal Next.js error: Router action dispatched before initialization."),"__NEXT_ERROR_CODE",{value:"E668",enumerable:!1,configurable:!0});h(a)}function j(a){let[b,c]=f.default.useState(a.state);h=b=>a.dispatch(b,c);let d=(0,f.useMemo)(()=>b,[b]);return(0,g.isThenable)(d)?(0,f.use)(d):d}("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},20611,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"callServer",{enumerable:!0,get:function(){return g}});let d=a.r(72131),e=a.r(88347),f=a.r(90841);async function g(a,b){return new Promise((c,g)=>{(0,d.startTransition)(()=>{(0,f.dispatchAppRouterAction)({type:e.ACTION_SERVER_ACTION,actionId:a,actionArgs:b,resolve:c,reject:g})})})}("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},1722,(a,b,c)=>{"use strict";let d;Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"findSourceMapURL",{enumerable:!0,get:function(){return d}});("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},8591,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"useMergedRef",{enumerable:!0,get:function(){return e}});let d=a.r(72131);function e(a,b){let c=(0,d.useRef)(null),e=(0,d.useRef)(null);return(0,d.useCallback)(d=>{if(null===d){let a=c.current;a&&(c.current=null,a());let b=e.current;b&&(e.current=null,b())}else a&&(c.current=f(a,d)),b&&(e.current=f(b,d))},[a,b])}function f(a,b){if("function"!=typeof a)return a.current=b,()=>{a.current=null};{let c=a(b);return"function"==typeof c?c:()=>a(null)}}("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},92434,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"warnOnce",{enumerable:!0,get:function(){return d}});let d=a=>{}},68063,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={getDeploymentId:function(){return f},getDeploymentIdQueryOrEmptyString:function(){return g}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});function f(){return!1}function g(){return""}},70106,a=>{"use strict";var b=a.i(72131);let c=(...a)=>a.filter((a,b,c)=>!!a&&""!==a.trim()&&c.indexOf(a)===b).join(" ").trim(),d=a=>{let b=a.replace(/^([A-Z])|[\s-_]+(\w)/g,(a,b,c)=>c?c.toUpperCase():b.toLowerCase());return b.charAt(0).toUpperCase()+b.slice(1)};var e={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};let f=(0,b.forwardRef)(({color:a="currentColor",size:d=24,strokeWidth:f=2,absoluteStrokeWidth:g,className:h="",children:i,iconNode:j,...k},l)=>(0,b.createElement)("svg",{ref:l,...e,width:d,height:d,stroke:a,strokeWidth:g?24*Number(f)/Number(d):f,className:c("lucide",h),...!i&&!(a=>{for(let b in a)if(b.startsWith("aria-")||"role"===b||"title"===b)return!0;return!1})(k)&&{"aria-hidden":"true"},...k},[...j.map(([a,c])=>(0,b.createElement)(a,c)),...Array.isArray(i)?i:[i]])),g=(a,e)=>{let g=(0,b.forwardRef)(({className:g,...h},i)=>(0,b.createElement)(f,{ref:i,iconNode:e,className:c(`lucide-${d(a).replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase()}`,`lucide-${a}`,g),...h}));return g.displayName=d(a),g};a.s(["default",()=>g],70106)},81560,a=>{"use strict";let b=(0,a.i(70106).default)("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);a.s(["Trash2",()=>b],81560)},79108,a=>{"use strict";a.i(10849),a.s([])},13749,a=>{"use strict";let b=(0,a.i(70106).default)("chevron-left",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);a.s(["ChevronLeft",()=>b],13749)},6704,a=>{"use strict";let b,c;var d,e=a.i(72131);let f={data:""},g=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,h=/\/\*[^]*?\*\/|  +/g,i=/\n+/g,j=(a,b)=>{let c="",d="",e="";for(let f in a){let g=a[f];"@"==f[0]?"i"==f[1]?c=f+" "+g+";":d+="f"==f[1]?j(g,f):f+"{"+j(g,"k"==f[1]?"":b)+"}":"object"==typeof g?d+=j(g,b?b.replace(/([^,])+/g,a=>f.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,b=>/&/.test(b)?b.replace(/&/g,a):a?a+" "+b:b)):f):null!=g&&(f=/^--/.test(f)?f:f.replace(/[A-Z]/g,"-$&").toLowerCase(),e+=j.p?j.p(f,g):f+":"+g+";")}return c+(b&&e?b+"{"+e+"}":e)+d},k={},l=a=>{if("object"==typeof a){let b="";for(let c in a)b+=c+l(a[c]);return b}return a};function m(a){let b,c,d=this||{},e=a.call?a(d.p):a;return((a,b,c,d,e)=>{var f;let m=l(a),n=k[m]||(k[m]=(a=>{let b=0,c=11;for(;b<a.length;)c=101*c+a.charCodeAt(b++)>>>0;return"go"+c})(m));if(!k[n]){let b=m!==a?a:(a=>{let b,c,d=[{}];for(;b=g.exec(a.replace(h,""));)b[4]?d.shift():b[3]?(c=b[3].replace(i," ").trim(),d.unshift(d[0][c]=d[0][c]||{})):d[0][b[1]]=b[2].replace(i," ").trim();return d[0]})(a);k[n]=j(e?{["@keyframes "+n]:b}:b,c?"":"."+n)}let o=c&&k.g?k.g:null;return c&&(k.g=k[n]),f=k[n],o?b.data=b.data.replace(o,f):-1===b.data.indexOf(f)&&(b.data=d?f+b.data:b.data+f),n})(e.unshift?e.raw?(b=[].slice.call(arguments,1),c=d.p,e.reduce((a,d,e)=>{let f=b[e];if(f&&f.call){let a=f(c),b=a&&a.props&&a.props.className||/^go/.test(a)&&a;f=b?"."+b:a&&"object"==typeof a?a.props?"":j(a,""):!1===a?"":a}return a+d+(null==f?"":f)},"")):e.reduce((a,b)=>Object.assign(a,b&&b.call?b(d.p):b),{}):e,d.target||f,d.g,d.o,d.k)}m.bind({g:1});let n,o,p,q=m.bind({k:1});function r(a,b){let c=this||{};return function(){let d=arguments;function e(f,g){let h=Object.assign({},f),i=h.className||e.className;c.p=Object.assign({theme:o&&o()},h),c.o=/ *go\d+/.test(i),h.className=m.apply(c,d)+(i?" "+i:""),b&&(h.ref=g);let j=a;return a[0]&&(j=h.as||a,delete h.as),p&&j[0]&&p(h),n(j,h)}return b?b(e):e}}var s=(a,b)=>"function"==typeof a?a(b):a,t=(b=0,()=>(++b).toString()),u="default",v=(a,b)=>{let{toastLimit:c}=a.settings;switch(b.type){case 0:return{...a,toasts:[b.toast,...a.toasts].slice(0,c)};case 1:return{...a,toasts:a.toasts.map(a=>a.id===b.toast.id?{...a,...b.toast}:a)};case 2:let{toast:d}=b;return v(a,{type:+!!a.toasts.find(a=>a.id===d.id),toast:d});case 3:let{toastId:e}=b;return{...a,toasts:a.toasts.map(a=>a.id===e||void 0===e?{...a,dismissed:!0,visible:!1}:a)};case 4:return void 0===b.toastId?{...a,toasts:[]}:{...a,toasts:a.toasts.filter(a=>a.id!==b.toastId)};case 5:return{...a,pausedAt:b.time};case 6:let f=b.time-(a.pausedAt||0);return{...a,pausedAt:void 0,toasts:a.toasts.map(a=>({...a,pauseDuration:a.pauseDuration+f}))}}},w=[],x={toasts:[],pausedAt:void 0,settings:{toastLimit:20}},y={},z=(a,b=u)=>{y[b]=v(y[b]||x,a),w.forEach(([a,c])=>{a===b&&c(y[b])})},A=a=>Object.keys(y).forEach(b=>z(a,b)),B=(a=u)=>b=>{z(b,a)},C=a=>(b,c)=>{let d,e=((a,b="blank",c)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:b,ariaProps:{role:"status","aria-live":"polite"},message:a,pauseDuration:0,...c,id:(null==c?void 0:c.id)||t()}))(b,a,c);return B(e.toasterId||(d=e.id,Object.keys(y).find(a=>y[a].toasts.some(a=>a.id===d))))({type:2,toast:e}),e.id},D=(a,b)=>C("blank")(a,b);D.error=C("error"),D.success=C("success"),D.loading=C("loading"),D.custom=C("custom"),D.dismiss=(a,b)=>{let c={type:3,toastId:a};b?B(b)(c):A(c)},D.dismissAll=a=>D.dismiss(void 0,a),D.remove=(a,b)=>{let c={type:4,toastId:a};b?B(b)(c):A(c)},D.removeAll=a=>D.remove(void 0,a),D.promise=(a,b,c)=>{let d=D.loading(b.loading,{...c,...null==c?void 0:c.loading});return"function"==typeof a&&(a=a()),a.then(a=>{let e=b.success?s(b.success,a):void 0;return e?D.success(e,{id:d,...c,...null==c?void 0:c.success}):D.dismiss(d),a}).catch(a=>{let e=b.error?s(b.error,a):void 0;e?D.error(e,{id:d,...c,...null==c?void 0:c.error}):D.dismiss(d)}),a};var E=q`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,F=q`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,G=q`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,H=r("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${a=>a.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${E} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${F} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${a=>a.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${G} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,I=q`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,J=r("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${a=>a.secondary||"#e0e0e0"};
  border-right-color: ${a=>a.primary||"#616161"};
  animation: ${I} 1s linear infinite;
`,K=q`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,L=q`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,M=r("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${a=>a.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${K} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${L} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${a=>a.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,N=r("div")`
  position: absolute;
`,O=r("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,P=q`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Q=r("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${P} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,R=({toast:a})=>{let{icon:b,type:c,iconTheme:d}=a;return void 0!==b?"string"==typeof b?e.createElement(Q,null,b):b:"blank"===c?null:e.createElement(O,null,e.createElement(J,{...d}),"loading"!==c&&e.createElement(N,null,"error"===c?e.createElement(H,{...d}):e.createElement(M,{...d})))},S=r("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,T=r("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`;e.memo(({toast:a,position:b,style:d,children:f})=>{let g=a.height?((a,b)=>{let d=a.includes("top")?1:-1,[e,f]=c?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[`
0% {transform: translate3d(0,${-200*d}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*d}%,-1px) scale(.6); opacity:0;}
`];return{animation:b?`${q(e)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${q(f)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}})(a.position||b||"top-center",a.visible):{opacity:0},h=e.createElement(R,{toast:a}),i=e.createElement(T,{...a.ariaProps},s(a.message,a));return e.createElement(S,{className:a.className,style:{...g,...d,...a.style}},"function"==typeof f?f({icon:h,message:i}):e.createElement(e.Fragment,null,h,i))}),d=e.createElement,j.p=void 0,n=d,o=void 0,p=void 0,m`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,a.s(["default",()=>D],6704)},56374,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944);a.i(79108);var e=a.i(10849),f=a.i(16391),g=a.i(13749),h=a.i(38246),i=a.i(6704);function j(){let a=(0,e.createClient)(),j=(0,d.useRouter)(),[k,l]=(0,c.useState)(!1),[m,n]=(0,c.useState)([]),[o,p]=(0,c.useState)({global_sizes:[],global_colors:[]}),[q,r]=(0,c.useState)({name:"",slug:"",description:"",price:"",compare_price:"",inventory:"0",category_type:"",is_active:!0,is_sale:!1}),[s,t]=(0,c.useState)([]),[u,v]=(0,c.useState)([]),[w,x]=(0,c.useState)([]);(0,c.useEffect)(()=>{(async()=>{let[{data:b},{data:c}]=await Promise.all([a.from("categories").select("id, name"),a.from("store_settings").select("global_sizes, global_colors").eq("id",1).single()]);b&&n(b),c&&p({global_sizes:c.global_sizes||[],global_colors:c.global_colors||[]})})()},[a]);let y=async b=>{if(b.preventDefault(),!q.name||!q.price||!q.category_type)return void i.default.error("Please fill in required fields.");l(!0);let c=async()=>{let{data:b,error:c}=await a.from("products").insert([{name:q.name,slug:q.slug,description:q.description||null,price_ghs:parseFloat(q.price),compare_price_ghs:q.compare_price?parseFloat(q.compare_price):null,inventory_count:parseInt(q.inventory),category_type:q.category_type,media:s,sizes:u,colors:w,is_active:q.is_active,is_sale:q.is_sale}]).select().single();if(c)throw c;return b};i.default.promise(c(),{loading:"Architecting specimen data...",success:"Product successfully added to collection.",error:a=>`Failed to save: ${a.message}`}).then(()=>{j.push("/admin/products"),j.refresh()}).finally(()=>{l(!1)})};return(0,b.jsxs)("div",{className:"p-8 max-w-5xl mx-auto",children:[(0,b.jsxs)(h.default,{href:"/admin/products",className:"flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-8 group",children:[(0,b.jsx)(g.ChevronLeft,{size:12,className:"group-hover:-translate-x-1 transition-transform"})," Back to Collection"]}),(0,b.jsxs)("form",{onSubmit:y,className:"space-y-12",children:[(0,b.jsxs)("header",{className:"flex items-end justify-between border-b border-gray-100 pb-8",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("h1",{className:"text-3xl font-bold text-black",style:{fontFamily:"var(--font-cinzel), Georgia, serif"},children:"New Specimen"}),(0,b.jsx)("p",{className:"text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest",children:"Atelier Catalog Input — v2.5"})]}),(0,b.jsx)("button",{type:"submit",disabled:k,className:"bg-black text-white text-[11px] uppercase tracking-[0.2em] px-10 py-4 hover:bg-neutral-800 transition-all font-bold disabled:opacity-50",children:k?"Persisting...":"Save Product"})]}),(0,b.jsxs)("div",{className:"grid grid-cols-1 lg:grid-cols-12 gap-16",children:[(0,b.jsx)("div",{className:"lg:col-span-12",children:(0,b.jsx)(f.ImageUploader,{bucket:"product-images",folder:"catalog",currentUrls:s,onUpload:t,maxFiles:5,aspectRatio:"video",label:"Product Visual Media (Images or MP4 — Max 5)"})}),(0,b.jsxs)("div",{className:"lg:col-span-7 space-y-12",children:[(0,b.jsxs)("section",{className:"space-y-8",children:[(0,b.jsx)("h2",{className:"text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 border-b border-gray-100 pb-2",children:"Core Identity"}),(0,b.jsxs)("div",{className:"space-y-6",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2",children:"Name *"}),(0,b.jsx)("input",{type:"text",required:!0,value:q.name,onChange:a=>{var b;return b=a.target.value,void r(a=>({...a,name:b,slug:b.toLowerCase().replace(/[^\w ]+/g,"").replace(/ +/g,"-")}))},className:"w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3",placeholder:"e.g. Noir Silk Slip"})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2",children:"Slug"}),(0,b.jsx)("input",{type:"text",value:q.slug,onChange:a=>r({...q,slug:a.target.value}),className:"w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3"})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2",children:"Description"}),(0,b.jsx)("textarea",{rows:4,value:q.description,onChange:a=>r({...q,description:a.target.value}),className:"w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3",placeholder:"Technical details..."})]})]})]}),(0,b.jsxs)("section",{className:"space-y-8",children:[(0,b.jsx)("h2",{className:"text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 border-b border-gray-100 pb-2",children:"Variant Curation"}),(0,b.jsxs)("div",{className:"space-y-8",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"block text-xs font-bold text-gray-900 uppercase tracking-widest mb-4",children:"Available Sizes"}),(0,b.jsx)("div",{className:"flex flex-wrap gap-2",children:o.global_sizes.map(a=>(0,b.jsx)("button",{type:"button",onClick:()=>{v(b=>b.includes(a)?b.filter(b=>b!==a):[...b,a])},className:`px-4 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all ${u.includes(a)?"bg-black text-white border-black":"bg-white text-gray-400 border-gray-200 hover:border-black"}`,children:a},a))})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"block text-xs font-bold text-gray-900 uppercase tracking-widest mb-4",children:"Core Colors"}),(0,b.jsx)("div",{className:"flex flex-wrap gap-2",children:o.global_colors.map(a=>(0,b.jsx)("button",{type:"button",onClick:()=>{x(b=>b.includes(a)?b.filter(b=>b!==a):[...b,a])},className:`px-4 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all ${w.includes(a)?"bg-black text-white border-black":"bg-white text-gray-400 border-gray-200 hover:border-black"}`,children:a},a))})]})]})]})]}),(0,b.jsxs)("div",{className:"lg:col-span-5 space-y-12",children:[(0,b.jsxs)("section",{className:"space-y-8",children:[(0,b.jsx)("h2",{className:"text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 border-b border-gray-100 pb-2",children:"Financials"}),(0,b.jsxs)("div",{className:"space-y-6",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2",children:"Price (GH₵) *"}),(0,b.jsx)("input",{type:"number",step:"0.01",required:!0,value:q.price,onChange:a=>r({...q,price:a.target.value}),className:"w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3",placeholder:"0.00"})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2",children:"Compare At (GH₵)"}),(0,b.jsx)("input",{type:"number",step:"0.01",value:q.compare_price,onChange:a=>r({...q,compare_price:a.target.value}),className:"w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3",placeholder:"0.00"})]})]})]}),(0,b.jsxs)("section",{className:"space-y-8",children:[(0,b.jsx)("h2",{className:"text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 border-b border-gray-100 pb-2",children:"Status & Classification"}),(0,b.jsxs)("div",{className:"space-y-6",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2",children:"Category Segment *"}),(0,b.jsxs)("select",{required:!0,value:q.category_type,onChange:a=>r({...q,category_type:a.target.value}),className:"w-full bg-white border border-gray-300 text-black text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3",children:[(0,b.jsx)("option",{value:"",children:"Unclassified"}),m.map(a=>(0,b.jsx)("option",{value:a.name,children:a.name},a.id))]})]}),(0,b.jsxs)("div",{className:"space-y-6 pt-4",children:[(0,b.jsxs)("label",{className:"flex items-center gap-3 cursor-pointer group",children:[(0,b.jsx)("input",{type:"checkbox",checked:q.is_active,onChange:a=>r({...q,is_active:a.target.checked}),className:"w-4 h-4 accent-black border-gray-200"}),(0,b.jsx)("div",{children:(0,b.jsx)("span",{className:"block text-[10px] uppercase tracking-widest font-bold text-gray-900 group-hover:text-black transition-colors",children:"Visible in Storefront"})})]}),(0,b.jsxs)("label",{className:"flex items-center gap-3 cursor-pointer group",children:[(0,b.jsx)("input",{type:"checkbox",checked:q.is_sale,onChange:a=>r({...q,is_sale:a.target.checked}),className:"w-4 h-4 accent-black border-gray-200"}),(0,b.jsxs)("div",{children:[(0,b.jsx)("span",{className:"block text-[10px] uppercase tracking-widest font-bold text-gray-900 group-hover:text-black transition-colors",children:"Apply Sale Status"}),(0,b.jsx)("span",{className:"block text-[9px] text-gray-600 mt-1 uppercase tracking-widest",children:"Enabling this adds the 'SALE' ribbon on storefront"})]})]})]})]})]})]})]})]})]})}a.s(["default",()=>j])}];

//# sourceMappingURL=_2ec50839._.js.map
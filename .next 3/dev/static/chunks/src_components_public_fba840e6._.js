(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/public/HeroSlider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HeroSlider",
    ()=>HeroSlider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const FALLBACK_SLIDE = {
    id: "fallback",
    position: 1,
    enabled: true,
    image_url: null,
    overlay_opacity: 0.55,
    eyebrow: "New Collection",
    headline_line1: "Made for",
    headline_line2: "the Bold",
    headline_line3: "",
    body_text: "Explore our latest curated collection — crafted for those who dare to stand out.",
    cta_primary_label: "Shop Now",
    cta_primary_url: "/shop",
    cta_secondary_label: "New Arrivals",
    cta_secondary_url: "/shop?sort=newest"
};
function HeroSlider(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(29);
    if ($[0] !== "3cbba516ffeea0b873168cf81889b8e3797a6a80978c53f1af76eb568cb861be") {
        for(let $i = 0; $i < 29; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "3cbba516ffeea0b873168cf81889b8e3797a6a80978c53f1af76eb568cb861be";
    }
    const { slides } = t0;
    let t1;
    if ($[1] !== slides) {
        t1 = slides.length > 0 ? slides : [
            FALLBACK_SLIDE
        ];
        $[1] = slides;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const activeSlides = t1;
    const firstSlide = activeSlides[0];
    const [current, setCurrent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [isAdmin, setIsAdmin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    let t2;
    let t3;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "HeroSlider[useEffect()]": ()=>{
                fetch("/api/me").then(_HeroSliderUseEffectAnonymous).then({
                    "HeroSlider[useEffect() > (anonymous)()]": (t4)=>{
                        const { isAdmin: isAdmin_0 } = t4;
                        if (isAdmin_0) {
                            setIsAdmin(true);
                        }
                    }
                }["HeroSlider[useEffect() > (anonymous)()]"]).catch(_HeroSliderUseEffectAnonymous2);
            }
        })["HeroSlider[useEffect()]"];
        t3 = [];
        $[3] = t2;
        $[4] = t3;
    } else {
        t2 = $[3];
        t3 = $[4];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t2, t3);
    let t4;
    let t5;
    if ($[5] !== activeSlides.length) {
        t4 = ({
            "HeroSlider[useEffect()]": ()=>{
                if (activeSlides.length <= 1) {
                    return;
                }
                const timer = setInterval({
                    "HeroSlider[useEffect() > setInterval()]": ()=>{
                        setCurrent({
                            "HeroSlider[useEffect() > setInterval() > setCurrent()]": (prev)=>(prev + 1) % activeSlides.length
                        }["HeroSlider[useEffect() > setInterval() > setCurrent()]"]);
                    }
                }["HeroSlider[useEffect() > setInterval()]"], 5000);
                return ()=>clearInterval(timer);
            }
        })["HeroSlider[useEffect()]"];
        t5 = [
            activeSlides.length
        ];
        $[5] = activeSlides.length;
        $[6] = t4;
        $[7] = t5;
    } else {
        t4 = $[6];
        t5 = $[7];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t4, t5);
    let t6;
    if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = {
            height: "calc(100vh - 120px)"
        };
        $[8] = t6;
    } else {
        t6 = $[8];
    }
    let t7;
    if ($[9] !== current || $[10] !== firstSlide.headline_line1 || $[11] !== firstSlide.image_url) {
        t7 = firstSlide.image_url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            src: firstSlide.image_url,
            alt: firstSlide.headline_line1,
            fill: true,
            priority: true,
            loading: "eager",
            sizes: "100vw",
            className: `object-cover object-center transition-opacity duration-1000 ${current === 0 ? "opacity-100" : "opacity-0"}`
        }, void 0, false, {
            fileName: "[project]/src/components/public/HeroSlider.tsx",
            lineNumber: 113,
            columnNumber: 34
        }, this);
        $[9] = current;
        $[10] = firstSlide.headline_line1;
        $[11] = firstSlide.image_url;
        $[12] = t7;
    } else {
        t7 = $[12];
    }
    let t8;
    if ($[13] !== activeSlides || $[14] !== current) {
        let t9;
        if ($[16] !== current) {
            t9 = ({
                "HeroSlider[activeSlides.map()]": (slide, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 transition-opacity duration-1000",
                        style: {
                            opacity: index === current ? 1 : 0,
                            pointerEvents: index === current ? "auto" : "none"
                        },
                        "aria-hidden": index !== current,
                        children: [
                            index !== 0 && slide.image_url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                src: slide.image_url,
                                alt: slide.headline_line1,
                                fill: true,
                                quality: 85,
                                className: "object-cover object-center",
                                sizes: "100vw"
                            }, void 0, false, {
                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                lineNumber: 129,
                                columnNumber: 78
                            }, this) : !slide.image_url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0",
                                style: {
                                    background: "linear-gradient(135deg, #1a1208 0%, #2d1f0e 40%, #141210 100%)"
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                lineNumber: 129,
                                columnNumber: 236
                            }, this) : null,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 bg-black",
                                style: {
                                    opacity: slide.overlay_opacity
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                lineNumber: 131,
                                columnNumber: 24
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 flex flex-col justify-end pb-16 pl-12 md:pl-20 lg:pl-32",
                                children: [
                                    slide.eyebrow && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-white/70 text-[10px] tracking-[0.3em] uppercase mb-4",
                                        children: [
                                            "— ",
                                            slide.eyebrow
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/public/HeroSlider.tsx",
                                        lineNumber: 133,
                                        columnNumber: 124
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "font-serif text-6xl md:text-7xl lg:text-8xl leading-none mb-4",
                                        children: [
                                            slide.headline_line1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "block text-white",
                                                children: slide.headline_line1
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                                lineNumber: 133,
                                                columnNumber: 322
                                            }, this),
                                            slide.headline_line2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "block italic",
                                                style: {
                                                    color: "var(--gold, #C8A97A)"
                                                },
                                                children: slide.headline_line2
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                                lineNumber: 133,
                                                columnNumber: 412
                                            }, this),
                                            slide.headline_line3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "block text-white",
                                                children: slide.headline_line3
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                                lineNumber: 135,
                                                columnNumber: 73
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/public/HeroSlider.tsx",
                                        lineNumber: 133,
                                        columnNumber: 219
                                    }, this),
                                    slide.body_text && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-white/80 text-sm max-w-sm mt-4 leading-relaxed mb-8",
                                        children: slide.body_text
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/public/HeroSlider.tsx",
                                        lineNumber: 135,
                                        columnNumber: 163
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-center gap-3 mt-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: slide.cta_primary_url,
                                                className: "bg-white text-black px-8 py-3.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-black hover:text-white border border-white transition-all duration-300",
                                                children: slide.cta_primary_label
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                                lineNumber: 135,
                                                columnNumber: 313
                                            }, this),
                                            slide.cta_secondary_label && slide.cta_secondary_url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: slide.cta_secondary_url,
                                                className: "border border-white text-white px-8 py-3.5 text-[10px] tracking-[0.25em] uppercase hover:bg-white hover:text-black transition-all duration-300",
                                                children: slide.cta_secondary_label
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                                lineNumber: 135,
                                                columnNumber: 611
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/public/HeroSlider.tsx",
                                        lineNumber: 135,
                                        columnNumber: 257
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/public/HeroSlider.tsx",
                                lineNumber: 133,
                                columnNumber: 16
                            }, this)
                        ]
                    }, slide.id, true, {
                        fileName: "[project]/src/components/public/HeroSlider.tsx",
                        lineNumber: 126,
                        columnNumber: 61
                    }, this)
            })["HeroSlider[activeSlides.map()]"];
            $[16] = current;
            $[17] = t9;
        } else {
            t9 = $[17];
        }
        t8 = activeSlides.map(t9);
        $[13] = activeSlides;
        $[14] = current;
        $[15] = t8;
    } else {
        t8 = $[15];
    }
    let t9;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "absolute bottom-8 left-12 text-white/50 text-[9px] tracking-[0.4em] uppercase flex items-center gap-3 pointer-events-none",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "—"
                }, void 0, false, {
                    fileName: "[project]/src/components/public/HeroSlider.tsx",
                    lineNumber: 151,
                    columnNumber: 149
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "SCROLL"
                }, void 0, false, {
                    fileName: "[project]/src/components/public/HeroSlider.tsx",
                    lineNumber: 151,
                    columnNumber: 163
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/public/HeroSlider.tsx",
            lineNumber: 151,
            columnNumber: 10
        }, this);
        $[18] = t9;
    } else {
        t9 = $[18];
    }
    let t10;
    if ($[19] !== activeSlides || $[20] !== current) {
        t10 = activeSlides.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "absolute bottom-8 right-12 flex items-center gap-2",
            children: activeSlides.map({
                "HeroSlider[activeSlides.map()]": (_, index_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: {
                            "HeroSlider[activeSlides.map() > <button>.onClick]": ()=>setCurrent(index_0)
                        }["HeroSlider[activeSlides.map() > <button>.onClick]"],
                        "aria-label": `Go to slide ${index_0 + 1}`,
                        className: `transition-all duration-300 ${index_0 === current ? "w-8 h-[2px] bg-white" : "w-2 h-[2px] bg-white/40 hover:bg-white/70"}`
                    }, index_0, false, {
                        fileName: "[project]/src/components/public/HeroSlider.tsx",
                        lineNumber: 159,
                        columnNumber: 59
                    }, this)
            }["HeroSlider[activeSlides.map()]"])
        }, void 0, false, {
            fileName: "[project]/src/components/public/HeroSlider.tsx",
            lineNumber: 158,
            columnNumber: 38
        }, this);
        $[19] = activeSlides;
        $[20] = current;
        $[21] = t10;
    } else {
        t10 = $[21];
    }
    let t11;
    if ($[22] !== isAdmin) {
        t11 = isAdmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            href: "/cms?tab=hero-slides",
            style: {
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(20,18,16,0.75)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#fff",
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "7px 14px",
                borderRadius: 3,
                textDecoration: "none",
                transition: "background 0.15s"
            },
            onMouseEnter: _HeroSliderLinkOnMouseEnter,
            onMouseLeave: _HeroSliderLinkOnMouseLeave,
            "aria-label": "Edit hero slides",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    viewBox: "0 0 24 24",
                    width: "11",
                    height: "11",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.8",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                        }, void 0, false, {
                            fileName: "[project]/src/components/public/HeroSlider.tsx",
                            lineNumber: 190,
                            columnNumber: 269
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                        }, void 0, false, {
                            fileName: "[project]/src/components/public/HeroSlider.tsx",
                            lineNumber: 190,
                            columnNumber: 340
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/public/HeroSlider.tsx",
                    lineNumber: 190,
                    columnNumber: 124
                }, this),
                "Edit Slides"
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/public/HeroSlider.tsx",
            lineNumber: 171,
            columnNumber: 22
        }, this);
        $[22] = isAdmin;
        $[23] = t11;
    } else {
        t11 = $[23];
    }
    let t12;
    if ($[24] !== t10 || $[25] !== t11 || $[26] !== t7 || $[27] !== t8) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "relative overflow-hidden",
            style: t6,
            "aria-live": "polite",
            "aria-label": "Hero slideshow",
            children: [
                t7,
                t8,
                t9,
                t10,
                t11
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/public/HeroSlider.tsx",
            lineNumber: 198,
            columnNumber: 11
        }, this);
        $[24] = t10;
        $[25] = t11;
        $[26] = t7;
        $[27] = t8;
        $[28] = t12;
    } else {
        t12 = $[28];
    }
    return t12;
}
_s(HeroSlider, "HjEv6OpVv5szcGhj+5GZD4oH3w4=");
_c = HeroSlider;
function _HeroSliderLinkOnMouseLeave(e_0) {
    return e_0.currentTarget.style.background = "rgba(20,18,16,0.75)";
}
function _HeroSliderLinkOnMouseEnter(e) {
    return e.currentTarget.style.background = "rgba(20,18,16,0.95)";
}
function _HeroSliderUseEffectAnonymous2() {}
function _HeroSliderUseEffectAnonymous(r) {
    return r.json();
}
var _c;
__turbopack_context__.k.register(_c, "HeroSlider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/public/NewArrivalsCarousel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NewArrivalsCarousel",
    ()=>NewArrivalsCarousel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function isVideoUrl(url) {
    const lower = url.toLowerCase().split("?")[0];
    return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov");
}
/** First non-video URL in the array, used as video poster fallback. */ function posterUrl(urls) {
    return urls?.find((u)=>!isVideoUrl(u));
}
const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f0ede8'/%3E%3C/svg%3E";
const PER_PAGE = 4;
function NewArrivalsCarousel(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(21);
    if ($[0] !== "cbd09e3b4ee555a6ddc488338e04e3c1866aefeece230309a8afc58b556d8157") {
        for(let $i = 0; $i < 21; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "cbd09e3b4ee555a6ddc488338e04e3c1866aefeece230309a8afc58b556d8157";
    }
    const { products } = t0;
    const [pos, setPos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const total = products.length;
    let canNext;
    let canPrev;
    let end;
    let t1;
    let t2;
    if ($[1] !== pos || $[2] !== products || $[3] !== total) {
        const visible = products.slice(pos, pos + PER_PAGE);
        end = Math.min(pos + PER_PAGE, total);
        canPrev = pos > 0;
        canNext = pos + PER_PAGE < total;
        t1 = "grid grid-cols-2 md:grid-cols-4 gap-4";
        t2 = visible.map(_NewArrivalsCarouselVisibleMap);
        $[1] = pos;
        $[2] = products;
        $[3] = total;
        $[4] = canNext;
        $[5] = canPrev;
        $[6] = end;
        $[7] = t1;
        $[8] = t2;
    } else {
        canNext = $[4];
        canPrev = $[5];
        end = $[6];
        t1 = $[7];
        t2 = $[8];
    }
    let t3;
    if ($[9] !== t1 || $[10] !== t2) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t1,
            children: t2
        }, void 0, false, {
            fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
            lineNumber: 74,
            columnNumber: 10
        }, this);
        $[9] = t1;
        $[10] = t2;
        $[11] = t3;
    } else {
        t3 = $[11];
    }
    let t4;
    if ($[12] !== canNext || $[13] !== canPrev || $[14] !== end || $[15] !== pos || $[16] !== total) {
        t4 = total > PER_PAGE && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center mt-8 gap-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: {
                        "NewArrivalsCarousel[<button>.onClick]": ()=>setPos(_NewArrivalsCarouselButtonOnClickSetPos)
                    }["NewArrivalsCarousel[<button>.onClick]"],
                    disabled: !canPrev,
                    "aria-label": "Previous",
                    className: "w-8 h-8 border border-neutral-300 flex items-center justify-center text-base hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 shrink-0",
                    children: "‹"
                }, void 0, false, {
                    fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                    lineNumber: 83,
                    columnNumber: 76
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 h-[1px] bg-neutral-200 relative",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-y-0 left-0 bg-black transition-all duration-300",
                        style: {
                            width: `${end / total * 100}%`
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                        lineNumber: 85,
                        columnNumber: 343
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                    lineNumber: 85,
                    columnNumber: 287
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: {
                        "NewArrivalsCarousel[<button>.onClick]": ()=>setPos({
                                "NewArrivalsCarousel[<button>.onClick > setPos()]": (p_1)=>Math.min(total - PER_PAGE, p_1 + PER_PAGE)
                            }["NewArrivalsCarousel[<button>.onClick > setPos()]"])
                    }["NewArrivalsCarousel[<button>.onClick]"],
                    disabled: !canNext,
                    "aria-label": "Next",
                    className: "w-8 h-8 border border-neutral-300 flex items-center justify-center text-base hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 shrink-0",
                    children: "›"
                }, void 0, false, {
                    fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                    lineNumber: 87,
                    columnNumber: 20
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-[10px] tracking-widest text-neutral-400 uppercase whitespace-nowrap shrink-0",
                    children: [
                        pos + 1,
                        "–",
                        end,
                        " of ",
                        total
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                    lineNumber: 91,
                    columnNumber: 283
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
            lineNumber: 83,
            columnNumber: 30
        }, this);
        $[12] = canNext;
        $[13] = canPrev;
        $[14] = end;
        $[15] = pos;
        $[16] = total;
        $[17] = t4;
    } else {
        t4 = $[17];
    }
    let t5;
    if ($[18] !== t3 || $[19] !== t4) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                t3,
                t4
            ]
        }, void 0, true);
        $[18] = t3;
        $[19] = t4;
        $[20] = t5;
    } else {
        t5 = $[20];
    }
    return t5;
}
_s(NewArrivalsCarousel, "/4n9uvOPlXHpdVwmRDMBC6BFydI=");
_c = NewArrivalsCarousel;
function _NewArrivalsCarouselButtonOnClickSetPos(p_0) {
    return Math.max(0, p_0 - PER_PAGE);
}
function _NewArrivalsCarouselVisibleMap(p) {
    const isOnSale = p.is_sale && p.discount_value > 0;
    const salePrice = isOnSale ? p.price_ghs * (1 - p.discount_value / 100) : null;
    const isOos = p.track_inventory && (p.inventory_count ?? 0) <= 0;
    const isPreorder = isOos && p.preorder_enabled;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        href: `/products/${p.slug}`,
        className: "group block",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative aspect-[3/4] overflow-hidden bg-neutral-100",
                children: [
                    (()=>{
                        const primaryUrl = p.image_urls?.[0];
                        if (primaryUrl && isVideoUrl(primaryUrl)) {
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                                src: primaryUrl,
                                poster: posterUrl(p.image_urls),
                                preload: "metadata",
                                muted: true,
                                playsInline: true,
                                className: "absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                            }, void 0, false, {
                                fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                                lineNumber: 123,
                                columnNumber: 18
                            }, this);
                        }
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            src: primaryUrl || FALLBACK,
                            alt: p.name,
                            fill: true,
                            className: "object-cover object-top group-hover:scale-105 transition-transform duration-700",
                            sizes: "(max-width: 768px) 50vw, 25vw"
                        }, void 0, false, {
                            fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                            lineNumber: 125,
                            columnNumber: 16
                        }, this);
                    })(),
                    isPreorder ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute top-2.5 left-2.5 text-white text-[9px] tracking-[0.15em] uppercase px-2 py-1 font-bold leading-none",
                        style: {
                            background: "#C9963A"
                        },
                        children: "PRE-ORDER"
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                        lineNumber: 126,
                        columnNumber: 26
                    }, this) : isOos ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute top-2.5 left-2.5 bg-neutral-500 text-white text-[9px] tracking-[0.15em] uppercase px-2 py-1 font-bold leading-none",
                        children: "SOLD OUT"
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                        lineNumber: 128,
                        columnNumber: 37
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute top-2.5 left-2.5 bg-black text-white text-[9px] tracking-[0.15em] uppercase px-2 py-1 font-bold leading-none",
                        children: "NEW"
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                        lineNumber: 128,
                        columnNumber: 197
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                lineNumber: 120,
                columnNumber: 82
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs uppercase tracking-wide font-bold text-black mt-3 line-clamp-1",
                children: p.name
            }, void 0, false, {
                fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                lineNumber: 128,
                columnNumber: 350
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 mt-1",
                children: isOnSale && salePrice !== null ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs text-red-600 font-semibold",
                            children: [
                                "GH₵",
                                salePrice.toFixed(2)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                            lineNumber: 128,
                            columnNumber: 530
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs text-neutral-400 line-through",
                            children: [
                                "GH₵",
                                Number(p.price_ghs).toFixed(2)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                            lineNumber: 128,
                            columnNumber: 615
                        }, this)
                    ]
                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-xs text-black",
                    children: [
                        "GH₵",
                        Number(p.price_ghs).toFixed(2)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                    lineNumber: 128,
                    columnNumber: 719
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
                lineNumber: 128,
                columnNumber: 448
            }, this)
        ]
    }, p.slug, true, {
        fileName: "[project]/src/components/public/NewArrivalsCarousel.tsx",
        lineNumber: 120,
        columnNumber: 10
    }, this);
}
var _c;
__turbopack_context__.k.register(_c, "NewArrivalsCarousel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/public/OptInSection.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OptInSection",
    ()=>OptInSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
function OptInSection({ enabled, title, subtitle, couponEnabled, couponCode }) {
    _s();
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("idle");
    const [returnedCode, setReturnedCode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    if (!enabled) return null;
    async function handleSubmit(e) {
        e.preventDefault();
        if (!email.trim()) return;
        setStatus("loading");
        try {
            const res = await fetch("/api/newsletter/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.trim()
                })
            });
            const data = await res.json();
            if (data.alreadySubscribed) {
                setStatus("duplicate");
            } else if (data.success) {
                setStatus("success");
                setReturnedCode(data.couponCode || couponCode);
            } else {
                setStatus("error");
            }
        } catch  {
            setStatus("error");
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "bg-[#0a0a0a] py-28 text-center relative overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute inset-0 flex items-center justify-center select-none pointer-events-none",
                "aria-hidden": "true",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-white/[0.03] font-serif font-bold leading-none",
                    style: {
                        fontSize: "clamp(80px, 20vw, 220px)",
                        letterSpacing: "0.15em"
                    },
                    children: "MISS TOKYO"
                }, void 0, false, {
                    fileName: "[project]/src/components/public/OptInSection.tsx",
                    lineNumber: 52,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/public/OptInSection.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative z-10 max-w-lg mx-auto px-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[#C8A97A] text-[9px] tracking-[0.4em] uppercase mb-4",
                        children: "JOIN THE MISS TOKYO FAMILY"
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 62,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "font-serif text-4xl md:text-5xl text-white leading-tight mb-4",
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 67,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-neutral-400 text-sm max-w-md mx-auto mb-8 leading-relaxed",
                        children: subtitle
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this),
                    status === "success" && returnedCode && couponEnabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border border-[#C8A97A]/40 bg-[#C8A97A]/10 px-6 py-5 mb-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white text-sm leading-relaxed",
                            children: [
                                "Your code is",
                                " ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    className: "text-[#C8A97A] tracking-[0.2em] font-bold",
                                    children: returnedCode
                                }, void 0, false, {
                                    fileName: "[project]/src/components/public/OptInSection.tsx",
                                    lineNumber: 80,
                                    columnNumber: 15
                                }, this),
                                " ",
                                "— use it at checkout!"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/public/OptInSection.tsx",
                            lineNumber: 78,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 77,
                        columnNumber: 67
                    }, this),
                    status === "success" && !couponEnabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border border-white/20 bg-white/5 px-6 py-5 mb-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white text-sm",
                            children: "You're subscribed! Welcome to the family."
                        }, void 0, false, {
                            fileName: "[project]/src/components/public/OptInSection.tsx",
                            lineNumber: 86,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 85,
                        columnNumber: 52
                    }, this),
                    status === "duplicate" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border border-white/20 bg-white/5 px-6 py-5 mb-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white/70 text-sm",
                            children: "You're already on the list!"
                        }, void 0, false, {
                            fileName: "[project]/src/components/public/OptInSection.tsx",
                            lineNumber: 92,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 91,
                        columnNumber: 36
                    }, this),
                    status === "error" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border border-red-500/30 bg-red-500/10 px-6 py-5 mb-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-red-400 text-sm",
                            children: "Something went wrong. Please try again."
                        }, void 0, false, {
                            fileName: "[project]/src/components/public/OptInSection.tsx",
                            lineNumber: 96,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 95,
                        columnNumber: 32
                    }, this),
                    status !== "success" && status !== "duplicate" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        onSubmit: handleSubmit,
                        className: "flex gap-0 max-w-sm mx-auto",
                        noValidate: true,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "email",
                                value: email,
                                onChange: (e_0)=>setEmail(e_0.target.value),
                                placeholder: "Your email address",
                                required: true,
                                disabled: status === "loading",
                                className: "flex-1 bg-transparent border border-neutral-600 px-4 py-3 text-white text-xs tracking-widest outline-none focus:border-white placeholder:text-neutral-500 disabled:opacity-50"
                            }, void 0, false, {
                                fileName: "[project]/src/components/public/OptInSection.tsx",
                                lineNumber: 101,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "submit",
                                disabled: status === "loading",
                                className: "bg-[#C8A97A] text-black text-[10px] tracking-[0.3em] uppercase font-bold px-6 py-3 hover:bg-[#b89668] transition-colors duration-200 disabled:opacity-60 whitespace-nowrap",
                                children: status === "loading" ? "..." : "SUBSCRIBE"
                            }, void 0, false, {
                                fileName: "[project]/src/components/public/OptInSection.tsx",
                                lineNumber: 102,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 100,
                        columnNumber: 60
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-neutral-600 text-[10px] tracking-widest uppercase mt-5",
                        children: "No spam ever. Unsubscribe at any time."
                    }, void 0, false, {
                        fileName: "[project]/src/components/public/OptInSection.tsx",
                        lineNumber: 108,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/public/OptInSection.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/public/OptInSection.tsx",
        lineNumber: 49,
        columnNumber: 10
    }, this);
}
_s(OptInSection, "tufB5Y8PPcG99S1aR94Xiw7dneo=");
_c = OptInSection;
var _c;
__turbopack_context__.k.register(_c, "OptInSection");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_components_public_fba840e6._.js.map
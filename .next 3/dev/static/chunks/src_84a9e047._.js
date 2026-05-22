(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/utils/imageCompression.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "compressToWebP",
    ()=>compressToWebP
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$browser$2d$image$2d$compression$2f$dist$2f$browser$2d$image$2d$compression$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/browser-image-compression/dist/browser-image-compression.mjs [app-client] (ecmascript)");
;
async function compressToWebP(file) {
    const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.93
    };
    const compressed = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$browser$2d$image$2d$compression$2f$dist$2f$browser$2d$image$2d$compression$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(file, options);
    // Rename to .webp
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([
        compressed
    ], `${baseName}.webp`, {
        type: "image/webp"
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/videoConversion.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "convertToMp4",
    ()=>convertToMp4
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$ffmpeg$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@ffmpeg/ffmpeg/dist/esm/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$ffmpeg$2f$dist$2f$esm$2f$classes$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@ffmpeg/ffmpeg/dist/esm/classes.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$util$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@ffmpeg/util/dist/esm/index.js [app-client] (ecmascript)");
;
;
let ffmpeg = null;
/**
 * Initializes and loads the FFmpeg instance.
 * Uses the v0.12+ API.
 */ async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$ffmpeg$2f$dist$2f$esm$2f$classes$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FFmpeg"]();
    // Using unpkg for core files to avoid local setup overhead
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
        coreURL: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$util$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBlobURL"])(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$util$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBlobURL"])(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
    });
    return ffmpeg;
}
async function convertToMp4(file, onProgress) {
    // Only transcode non-mp4 videos
    if (!file.type.startsWith("video/") || file.type === "video/mp4") {
        return file;
    }
    const instance = await loadFFmpeg();
    const inputName = "input_" + file.name;
    const outputName = "output_" + file.name.replace(/\.[^.]+$/, "") + ".mp4";
    try {
        // Log progress
        instance.on("log", ({ message })=>{
            console.log("[FFMPEG]", message);
        });
        instance.on("progress", ({ progress })=>{
            onProgress?.(Math.round(progress * 100));
        });
        // Write input file to FFmpeg's in-memory FS
        await instance.writeFile(inputName, await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$util$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchFile"])(file));
        // Execute transcoding
        // -c:v libx264: codec
        // -preset ultrafast: fastest conversion
        // -crf 28: baseline quality/compression ratio
        // -c:a aac: audio codec
        await instance.exec([
            "-i",
            inputName,
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-c:a",
            "aac",
            outputName
        ]);
        // Read output from FS
        const data = await instance.readFile(outputName);
        const uint8Data = new Uint8Array(data);
        // Cleanup FS
        await instance.deleteFile(inputName);
        await instance.deleteFile(outputName);
        // Return new File object
        return new File([
            uint8Data
        ], outputName, {
            type: "video/mp4"
        });
    } catch (err) {
        console.error("Transcoding failure:", err);
        throw new Error("Video optimization failed. Please try a standard MP4 file.");
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/miss-tokyo/ImageUploader.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ImageUploader",
    ()=>ImageUploader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$imageCompression$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/imageCompression.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$videoConversion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/videoConversion.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GripVertical$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/grip-vertical.js [app-client] (ecmascript) <export default as GripVertical>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@dnd-kit/core/dist/core.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@dnd-kit/sortable/dist/sortable.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$utilities$2f$dist$2f$utilities$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@dnd-kit/utilities/dist/utilities.esm.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
const ASPECT_CLASSES = {
    square: "aspect-square",
    video: "aspect-video",
    banner: "aspect-[21/9]",
    og: "aspect-[1200/630]"
};
const MAX_SIZE_MB = 100; // Increased to 100MB for video transcoding
const ACCEPTED = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/mpeg"
];
const ACCEPTED_ATTR = "image/*,video/mp4,video/quicktime,video/x-msvideo,video/mpeg";
function isMultiMode(props) {
    return "currentUrls" in props && props.currentUrls !== undefined;
}
function SortableImage(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(33);
    if ($[0] !== "ae7ac991232a63677ac57b87ac415718c5631292dfe201579e1669bb7b71bf1e") {
        for(let $i = 0; $i < 33; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ae7ac991232a63677ac57b87ac415718c5631292dfe201579e1669bb7b71bf1e";
    }
    const { url, isPrimary, onRemove } = t0;
    let t1;
    if ($[1] !== url) {
        t1 = {
            id: url
        };
        $[1] = url;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSortable"])(t1);
    let t2;
    if ($[3] !== transform) {
        t2 = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$utilities$2f$dist$2f$utilities$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CSS"].Transform.toString(transform);
        $[3] = transform;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    const t3 = isDragging ? 0.4 : 1;
    let t4;
    if ($[5] !== t2 || $[6] !== t3 || $[7] !== transition) {
        t4 = {
            transform: t2,
            transition,
            opacity: t3
        };
        $[5] = t2;
        $[6] = t3;
        $[7] = transition;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    const style = t4;
    let t5;
    if ($[9] !== url) {
        t5 = url.endsWith(".mp4");
        $[9] = url;
        $[10] = t5;
    } else {
        t5 = $[10];
    }
    const isVideo = t5;
    let t6;
    if ($[11] !== onRemove) {
        t6 = ({
            "SortableImage[handleRemove]": (e)=>{
                e.stopPropagation();
                if (window.confirm("Are you sure you want to remove this image?")) {
                    onRemove();
                }
            }
        })["SortableImage[handleRemove]"];
        $[11] = onRemove;
        $[12] = t6;
    } else {
        t6 = $[12];
    }
    const handleRemove = t6;
    let t7;
    if ($[13] !== isVideo || $[14] !== url) {
        t7 = isVideo ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
            src: url,
            className: "w-full h-full object-cover",
            muted: true
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
            lineNumber: 144,
            columnNumber: 20
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
            src: url,
            alt: "",
            className: "w-full h-full object-cover"
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
            lineNumber: 144,
            columnNumber: 94
        }, this);
        $[13] = isVideo;
        $[14] = url;
        $[15] = t7;
    } else {
        t7 = $[15];
    }
    let t8;
    if ($[16] !== isPrimary) {
        t8 = isPrimary && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "absolute top-2 left-2 z-20 bg-black/70 text-white text-[8px] uppercase tracking-widest px-1.5 py-0.5 pointer-events-none",
            children: "Primary"
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
            lineNumber: 153,
            columnNumber: 23
        }, this);
        $[16] = isPrimary;
        $[17] = t8;
    } else {
        t8 = $[17];
    }
    let t9;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
            size: 14,
            strokeWidth: 2
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
            lineNumber: 161,
            columnNumber: 10
        }, this);
        $[18] = t9;
    } else {
        t9 = $[18];
    }
    let t10;
    if ($[19] !== handleRemove) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            onClick: handleRemove,
            "aria-label": "Remove image",
            className: "absolute top-2 right-2 z-30 bg-red-500 hover:bg-red-600 text-white p-2 min-w-[36px] min-h-[36px] rounded-md shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity",
            children: t9
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
            lineNumber: 168,
            columnNumber: 11
        }, this);
        $[19] = handleRemove;
        $[20] = t10;
    } else {
        t10 = $[20];
    }
    let t11;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GripVertical$3e$__["GripVertical"], {
            size: 14,
            strokeWidth: 2
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
            lineNumber: 176,
            columnNumber: 11
        }, this);
        $[21] = t11;
    } else {
        t11 = $[21];
    }
    let t12;
    if ($[22] !== attributes || $[23] !== listeners || $[24] !== setActivatorNodeRef) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            ref: setActivatorNodeRef,
            ...attributes,
            ...listeners,
            "aria-label": "Drag to reorder",
            className: "absolute bottom-2 right-2 z-30 bg-black/60 hover:bg-black/80 text-white p-2 min-w-[36px] min-h-[36px] rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing",
            children: t11
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
            lineNumber: 183,
            columnNumber: 11
        }, this);
        $[22] = attributes;
        $[23] = listeners;
        $[24] = setActivatorNodeRef;
        $[25] = t12;
    } else {
        t12 = $[25];
    }
    let t13;
    if ($[26] !== setNodeRef || $[27] !== style || $[28] !== t10 || $[29] !== t12 || $[30] !== t7 || $[31] !== t8) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            ref: setNodeRef,
            style: style,
            className: "relative group aspect-square min-h-[10rem] overflow-hidden bg-neutral-100 border border-neutral-200 touch-none",
            children: [
                t7,
                t8,
                t10,
                t12
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
            lineNumber: 193,
            columnNumber: 11
        }, this);
        $[26] = setNodeRef;
        $[27] = style;
        $[28] = t10;
        $[29] = t12;
        $[30] = t7;
        $[31] = t8;
        $[32] = t13;
    } else {
        t13 = $[32];
    }
    return t13;
}
_s(SortableImage, "/RidAASBEnywOUdKgUBN93CVXKc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSortable"]
    ];
});
_c = SortableImage;
function ImageUploader(props) {
    _s1();
    const { bucket, folder = "", aspectRatio = "video", label } = props;
    const multiMode = isMultiMode(props);
    const initialUrls = multiMode ? props.currentUrls : props.currentUrl ? [
        props.currentUrl
    ] : [];
    const [previews, setPreviews] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialUrls);
    const [uploading, setUploading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [uploadCount, setUploadCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [isConverting, setIsConverting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [conversionProgress, setConversionProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeUrl, setActiveUrl] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const maxFiles = multiMode ? props.maxFiles ?? 1 : 1;
    const sensors = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSensors"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSensor"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PointerSensor"], {
        activationConstraint: {
            distance: 5
        }
    }), // TouchSensor with delay prevents scroll hijacking on mobile
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSensor"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TouchSensor"], {
        activationConstraint: {
            delay: 250,
            tolerance: 5
        }
    }));
    // ── Upload helpers ─────────────────────────────────────────────────────────
    const uploadFile = async (rawFile)=>{
        const isVideo = rawFile.type.startsWith("video/");
        if (!ACCEPTED.includes(rawFile.type)) {
            setError("Please upload a JPEG, PNG, WebP, GIF image, or MP4 video.");
            return null;
        }
        if (rawFile.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`File must be under ${MAX_SIZE_MB}MB.`);
            return null;
        }
        let file = rawFile;
        if (!isVideo) {
            try {
                file = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$imageCompression$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["compressToWebP"])(rawFile);
            } catch  {
                file = rawFile;
            }
        } else if (rawFile.type !== "video/mp4") {
            // Transcode non-mp4 videos
            try {
                setIsConverting(true);
                setConversionProgress(0);
                file = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$videoConversion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertToMp4"])(rawFile, (p)=>setConversionProgress(p));
            } catch (err) {
                setError(err.message || "Video optimization failed.");
                setIsConverting(false);
                return null;
            } finally{
                setIsConverting(false);
            }
        }
        const ext = isVideo ? "mp4" : "webp";
        const name = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const contentType = isVideo ? "video/mp4" : "image/webp";
        const { data, error: uploadErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].storage.from(bucket).upload(name, file, {
            contentType,
            upsert: false
        });
        if (uploadErr || !data) {
            setError(uploadErr?.message || "Upload failed.");
            return null;
        }
        const { data: { publicUrl } } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].storage.from(bucket).getPublicUrl(data.path);
        return publicUrl;
    };
    const handleFiles = async (files)=>{
        if (!files || files.length === 0) return;
        setError(null);
        const remaining = maxFiles - previews.length;
        const toUpload = Array.from(files).slice(0, remaining);
        if (toUpload.length === 0) return;
        setUploading(true);
        setUploadCount(toUpload.length);
        props.onUploading?.(true);
        const results = await Promise.all(toUpload.map(uploadFile));
        const newUrls = results.filter((u)=>u !== null);
        if (newUrls.length > 0) {
            const updated = [
                ...previews,
                ...newUrls
            ].slice(0, maxFiles);
            setPreviews(updated);
            if (multiMode) {
                props.onUpload(updated);
            } else {
                props.onUpload(updated[0]);
            }
        }
        setUploading(false);
        setUploadCount(0);
        props.onUploading?.(false);
    };
    const handleRemove = (index)=>{
        const updated_0 = previews.filter((_, i)=>i !== index);
        setPreviews(updated_0);
        if (multiMode) {
            props.onUpload(updated_0);
        } else {
            props.onUpload("");
            props.onRemove?.();
        }
    };
    // ── Drag handlers ──────────────────────────────────────────────────────────
    const handleDragStart = (event)=>{
        setActiveUrl(event.active.id);
    };
    const handleDragEnd = (event_0)=>{
        setActiveUrl(null);
        const { active, over } = event_0;
        if (!over || active.id === over.id) return;
        const oldIndex = previews.indexOf(active.id);
        const newIndex = previews.indexOf(over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const updated_1 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["arrayMove"])(previews, oldIndex, newIndex);
        setPreviews(updated_1);
        if (multiMode) {
            props.onUpload(updated_1);
        }
    };
    // ── Render ─────────────────────────────────────────────────────────────────
    const showDropzone = previews.length < maxFiles;
    const loadingLabel = uploadCount > 1 ? `Uploading ${uploadCount} files...` : "Uploading...";
    // Active drag preview tile
    const activeIsVideo = activeUrl?.endsWith(".mp4");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-2",
        children: [
            label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "block text-xs uppercase tracking-widest font-semibold text-neutral-700",
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 356,
                        columnNumber: 21
                    }, this),
                    previews.length > 0 && props.onRemove && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>{
                            setPreviews([]);
                            props.onRemove?.();
                        },
                        className: "text-[10px] text-red-500 hover:text-red-700 tracking-widest uppercase font-semibold transition-colors",
                        children: "Remove All"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 359,
                        columnNumber: 63
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 355,
                columnNumber: 23
            }, this),
            previews.length > 0 && (multiMode ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DndContext"], {
                sensors: sensors,
                collisionDetection: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["closestCenter"],
                onDragStart: handleDragStart,
                onDragEnd: handleDragEnd,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SortableContext"], {
                        items: previews,
                        strategy: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rectSortingStrategy"],
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 sm:grid-cols-3 gap-2",
                            children: previews.map((url, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SortableImage, {
                                    url: url,
                                    index: idx,
                                    isPrimary: idx === 0,
                                    onRemove: ()=>handleRemove(idx)
                                }, url, false, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                    lineNumber: 371,
                                    columnNumber: 61
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                            lineNumber: 370,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 369,
                        columnNumber: 25
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DragOverlay"], {
                        children: activeUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "aspect-square overflow-hidden border-2 border-black shadow-2xl opacity-90",
                            children: activeIsVideo ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                                src: activeUrl,
                                className: "w-full h-full object-cover",
                                muted: true
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 377,
                                columnNumber: 54
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: activeUrl,
                                alt: "",
                                className: "w-full h-full object-cover"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 377,
                                columnNumber: 127
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                            lineNumber: 376,
                            columnNumber: 43
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 375,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 368,
                columnNumber: 50
            }, this) : // Single mode — plain preview, no DnD
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `relative group overflow-hidden bg-neutral-100 border border-neutral-200 ${ASPECT_CLASSES[aspectRatio]}`,
                children: [
                    previews[0].endsWith(".mp4") ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                        src: previews[0],
                        className: "w-full h-full object-cover",
                        muted: true
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 383,
                        columnNumber: 57
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: previews[0],
                        alt: "",
                        className: "w-full h-full object-cover"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 383,
                        columnNumber: 132
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: (e)=>{
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to remove this image?")) {
                                handleRemove(0);
                            }
                        },
                        "aria-label": "Remove image",
                        className: "absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white p-2 min-w-[36px] min-h-[36px] rounded-md shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                            size: 13,
                            strokeWidth: 2
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                            lineNumber: 390,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 384,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 382,
                columnNumber: 5
            }, this)),
            showDropzone && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `${maxFiles === 1 && previews.length === 0 ? ASPECT_CLASSES[aspectRatio] : "h-24"} relative bg-neutral-100 border-2 border-dashed border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer group overflow-hidden`,
                onClick: ()=>!uploading && inputRef.current?.click(),
                onDrop: (e_0)=>{
                    e_0.preventDefault();
                    handleFiles(e_0.dataTransfer.files);
                },
                onDragOver: (e_1)=>e_1.preventDefault(),
                onDragEnter: (e_2)=>{
                    e_2.preventDefault();
                    e_2.currentTarget.classList.add("border-black");
                },
                onDragLeave: (e_3)=>{
                    e_3.preventDefault();
                    e_3.currentTarget.classList.remove("border-black");
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400 px-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-6 h-6",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 1,
                                    d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                    lineNumber: 407,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 406,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500 text-center",
                                children: uploading ? loadingLabel : maxFiles > 1 ? "Click or drag to upload (multiple)" : "Click or drag to upload"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 409,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 405,
                        columnNumber: 21
                    }, this),
                    isConverting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 z-50",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 415,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] uppercase tracking-[0.2em] font-bold text-black",
                                        children: "Optimizing Video..."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                        lineNumber: 417,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[9px] text-neutral-400 uppercase tracking-widest font-bold font-mono italic",
                                        children: [
                                            conversionProgress,
                                            "% Complete — Please wait"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                        lineNumber: 418,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 416,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 414,
                        columnNumber: 38
                    }, this),
                    uploading && !isConverting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 z-40",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 425,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-700",
                                children: loadingLabel
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 426,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 424,
                        columnNumber: 52
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 395,
                columnNumber: 30
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-red-600 tracking-wide",
                children: error
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 430,
                columnNumber: 23
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ref: inputRef,
                type: "file",
                accept: ACCEPTED_ATTR,
                multiple: maxFiles > 1,
                className: "hidden",
                onChange: (e_4)=>{
                    handleFiles(e_4.target.files);
                    e_4.target.value = "";
                }
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 432,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
        lineNumber: 354,
        columnNumber: 10
    }, this);
}
_s1(ImageUploader, "8Jko9SJSmNcFNsbkDlhfYEJJLy4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSensors"]
    ];
});
_c1 = ImageUploader;
var _c, _c1;
__turbopack_context__.k.register(_c, "SortableImage");
__turbopack_context__.k.register(_c1, "ImageUploader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/TagInput.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TagInput",
    ()=>TagInput
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function TagInput(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(30);
    if ($[0] !== "ab7b6783f711d9d321fdf068b44f2607cd2a82fb230171c8801c74a432d247b6") {
        for(let $i = 0; $i < 30; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ab7b6783f711d9d321fdf068b44f2607cd2a82fb230171c8801c74a432d247b6";
    }
    const { value, onChange, placeholder } = t0;
    const [inputValue, setInputValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    let t1;
    if ($[1] !== onChange || $[2] !== value) {
        t1 = ({
            "TagInput[addTag]": (raw)=>{
                const tag = raw.trim();
                if (!tag || value.includes(tag)) {
                    return;
                }
                onChange([
                    ...value,
                    tag
                ]);
            }
        })["TagInput[addTag]"];
        $[1] = onChange;
        $[2] = value;
        $[3] = t1;
    } else {
        t1 = $[3];
    }
    const addTag = t1;
    let t2;
    if ($[4] !== onChange || $[5] !== value) {
        t2 = ({
            "TagInput[removeTag]": (index)=>{
                onChange(value.filter({
                    "TagInput[removeTag > value.filter()]": (_, i)=>i !== index
                }["TagInput[removeTag > value.filter()]"]));
            }
        })["TagInput[removeTag]"];
        $[4] = onChange;
        $[5] = value;
        $[6] = t2;
    } else {
        t2 = $[6];
    }
    const removeTag = t2;
    let t3;
    if ($[7] !== addTag || $[8] !== inputValue || $[9] !== removeTag || $[10] !== value.length) {
        t3 = ({
            "TagInput[handleKeyDown]": (e)=>{
                if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(inputValue);
                    setInputValue("");
                } else {
                    if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
                        removeTag(value.length - 1);
                    }
                }
            }
        })["TagInput[handleKeyDown]"];
        $[7] = addTag;
        $[8] = inputValue;
        $[9] = removeTag;
        $[10] = value.length;
        $[11] = t3;
    } else {
        t3 = $[11];
    }
    const handleKeyDown = t3;
    let t4;
    if ($[12] !== addTag || $[13] !== inputValue) {
        t4 = ({
            "TagInput[handleBlur]": ()=>{
                if (inputValue.trim()) {
                    addTag(inputValue);
                    setInputValue("");
                }
            }
        })["TagInput[handleBlur]"];
        $[12] = addTag;
        $[13] = inputValue;
        $[14] = t4;
    } else {
        t4 = $[14];
    }
    const handleBlur = t4;
    let t5;
    if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = ({
            "TagInput[<div>.onClick]": ()=>inputRef.current?.focus()
        })["TagInput[<div>.onClick]"];
        $[15] = t5;
    } else {
        t5 = $[15];
    }
    let t6;
    if ($[16] !== removeTag || $[17] !== value) {
        let t7;
        if ($[19] !== removeTag) {
            t7 = ({
                "TagInput[value.map()]": (tag_0, i_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "inline-flex items-center gap-1 bg-neutral-100 text-neutral-700 text-[11px] font-medium px-2 py-0.5 rounded-sm tracking-wide",
                        children: [
                            tag_0,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                "aria-label": `Remove ${tag_0}`,
                                onClick: {
                                    "TagInput[value.map() > <button>.onClick]": (e_0)=>{
                                        e_0.stopPropagation();
                                        removeTag(i_0);
                                    }
                                }["TagInput[value.map() > <button>.onClick]"],
                                className: "text-neutral-400 hover:text-neutral-900 transition-colors leading-none ml-0.5",
                                children: "×"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TagInput.tsx",
                                lineNumber: 114,
                                columnNumber: 223
                            }, this)
                        ]
                    }, `${tag_0}-${i_0}`, true, {
                        fileName: "[project]/src/components/ui/TagInput.tsx",
                        lineNumber: 114,
                        columnNumber: 50
                    }, this)
            })["TagInput[value.map()]"];
            $[19] = removeTag;
            $[20] = t7;
        } else {
            t7 = $[20];
        }
        t6 = value.map(t7);
        $[16] = removeTag;
        $[17] = value;
        $[18] = t6;
    } else {
        t6 = $[18];
    }
    let t7;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = ({
            "TagInput[<input>.onChange]": (e_1)=>setInputValue(e_1.target.value)
        })["TagInput[<input>.onChange]"];
        $[21] = t7;
    } else {
        t7 = $[21];
    }
    const t8 = value.length === 0 ? placeholder : "";
    let t9;
    if ($[22] !== handleBlur || $[23] !== handleKeyDown || $[24] !== inputValue || $[25] !== t8) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            ref: inputRef,
            type: "text",
            value: inputValue,
            onChange: t7,
            onKeyDown: handleKeyDown,
            onBlur: handleBlur,
            placeholder: t8,
            className: "flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-neutral-800 placeholder:text-neutral-400 py-0.5"
        }, void 0, false, {
            fileName: "[project]/src/components/ui/TagInput.tsx",
            lineNumber: 145,
            columnNumber: 10
        }, this);
        $[22] = handleBlur;
        $[23] = handleKeyDown;
        $[24] = inputValue;
        $[25] = t8;
        $[26] = t9;
    } else {
        t9 = $[26];
    }
    let t10;
    if ($[27] !== t6 || $[28] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-wrap items-center gap-1.5 min-h-[38px] w-full border-b border-neutral-300 bg-transparent py-1.5 focus-within:border-black transition-colors cursor-text",
            onClick: t5,
            children: [
                t6,
                t9
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/TagInput.tsx",
            lineNumber: 156,
            columnNumber: 11
        }, this);
        $[27] = t6;
        $[28] = t9;
        $[29] = t10;
    } else {
        t10 = $[29];
    }
    return t10;
}
_s(TagInput, "neK+VFuasUSZMRLt39nIIKNkE4g=");
_c = TagInput;
var _c;
__turbopack_context__.k.register(_c, "TagInput");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/EmailsTab.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmailsTab",
    ()=>EmailsTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.js [app-client] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/message-square.js [app-client] (ecmascript) <export default as MessageSquare>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/send.js [app-client] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const ALL_EVENTS = [
    {
        key: "order_confirmed",
        label: "Order Confirmed",
        description: "Sent to the customer when payment is successfully processed via Paystack.",
        channels: [
            "email",
            "sms"
        ],
        previewTag: "Transactional"
    },
    {
        key: "order_shipped",
        label: "Order Shipped",
        description: "Sent to the customer when a rider is assigned and the order is on its way.",
        channels: [
            "email",
            "sms"
        ],
        previewTag: "Transactional"
    },
    {
        key: "order_fulfilled",
        label: "Order Fulfilled",
        description: "Sent to the customer when their order has been delivered and marked complete.",
        channels: [
            "email",
            "sms"
        ],
        previewTag: "Transactional"
    },
    {
        key: "order_cancelled",
        label: "Order Cancelled",
        description: "Sent to the customer if their order is cancelled for any reason.",
        channels: [
            "email",
            "sms"
        ],
        previewTag: "Transactional"
    },
    {
        key: "admin_new_order",
        label: "New Order Alert",
        description: "Internal notification sent to the atelier team when a new order is placed.",
        channels: [
            "email"
        ],
        adminOnly: true,
        previewTag: "Admin"
    },
    {
        key: "account_setup",
        label: "Account Setup",
        description: "Sent to first-time customers with a link to set their password and track orders.",
        channels: [
            "email"
        ],
        previewTag: "Onboarding"
    },
    {
        key: "invoice_sent",
        label: "Invoice Sent",
        description: "Sent to clients when an invoice or quotation is issued from the Finance panel.",
        channels: [
            "email"
        ],
        previewTag: "Finance"
    },
    {
        key: "wholesale_approved",
        label: "Wholesale Approved",
        description: "Sent to a customer when their account is promoted to wholesale status.",
        channels: [
            "email",
            "sms"
        ],
        previewTag: "Account"
    },
    {
        key: "wholesale_revoked",
        label: "Wholesale Revoked",
        description: "Sent to a customer when their wholesale access is removed.",
        channels: [
            "email"
        ],
        previewTag: "Account"
    },
    {
        key: "team_invite",
        label: "Team Invitation",
        description: "Sent to a new team member (admin or sales staff) when they are invited to the platform.",
        channels: [
            "email",
            "sms"
        ],
        adminOnly: true,
        previewTag: "Admin"
    }
];
// ── Dummy values injected into template variables for test sends ───────────────
const DUMMY_VARS = {
    "{order_id}": "TEST1234",
    "{customer_name}": "Test Customer",
    "{amount}": "GH₵ 1,200.00",
    "{rider_name}": "Kwame Mensah",
    "{rider_phone}": "+233 20 000 0000"
};
function injectDummyVars(text) {
    return Object.entries(DUMMY_VARS).reduce((str, [key, val])=>str.replaceAll(key, val), text);
}
// ── Email preview component ────────────────────────────────────────────────────
function EmailPreview(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(43);
    if ($[0] !== "9b010d9700cec8679985d0ab3580c8724c7cb0a017c499e33ed9303eb8d150dc") {
        for(let $i = 0; $i < 43; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "9b010d9700cec8679985d0ab3580c8724c7cb0a017c499e33ed9303eb8d150dc";
    }
    const { event, template, bizName } = t0;
    const name = bizName || "Miss Tokyo";
    const greeting = template.greeting || "Hello,";
    const body = template.body_text || "Your message body will appear here.";
    const subject = template.subject || event.label;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 uppercase tracking-widest",
            children: "Preview"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 122,
            columnNumber: 10
        }, this);
        $[1] = t1;
    } else {
        t1 = $[1];
    }
    let t2;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-neutral-400",
            children: "Subject:"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 129,
            columnNumber: 10
        }, this);
        $[2] = t2;
    } else {
        t2 = $[2];
    }
    let t3;
    if ($[3] !== subject) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-neutral-700",
            children: [
                t2,
                " ",
                subject
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 136,
            columnNumber: 10
        }, this);
        $[3] = subject;
        $[4] = t3;
    } else {
        t3 = $[4];
    }
    let t4;
    if ($[5] !== name) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-neutral-500 text-[10px]",
            children: [
                "From: ",
                name,
                " <no-reply@resend.dev>"
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 144,
            columnNumber: 10
        }, this);
        $[5] = name;
        $[6] = t4;
    } else {
        t4 = $[6];
    }
    let t5;
    if ($[7] !== t3 || $[8] !== t4) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border-b border-neutral-200 px-4 py-3 space-y-1",
            children: [
                t1,
                t3,
                t4
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 152,
            columnNumber: 10
        }, this);
        $[7] = t3;
        $[8] = t4;
        $[9] = t5;
    } else {
        t5 = $[9];
    }
    let t6;
    let t7;
    let t8;
    if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = {
            fontFamily: "Georgia, serif",
            padding: "24px 20px",
            background: "#fafaf9"
        };
        t7 = {
            maxWidth: 480,
            margin: "0 auto",
            background: "white",
            border: "1px solid #e5e5e5",
            padding: "32px 36px"
        };
        t8 = {
            fontSize: 18,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "0 0 4px",
            fontFamily: "Georgia, serif"
        };
        $[10] = t6;
        $[11] = t7;
        $[12] = t8;
    } else {
        t6 = $[10];
        t7 = $[11];
        t8 = $[12];
    }
    let t9;
    if ($[13] !== name) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
            style: t8,
            children: name
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 192,
            columnNumber: 10
        }, this);
        $[13] = name;
        $[14] = t9;
    } else {
        t9 = $[14];
    }
    let t10;
    if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
        t10 = {
            color: "#737373",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: "0 0 28px"
        };
        $[15] = t10;
    } else {
        t10 = $[15];
    }
    let t11;
    if ($[16] !== event.label) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            style: t10,
            children: event.label
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 213,
            columnNumber: 11
        }, this);
        $[16] = event.label;
        $[17] = t11;
    } else {
        t11 = $[17];
    }
    let t12;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = {
            fontSize: 13,
            color: "#171717",
            margin: "0 0 16px",
            fontFamily: "Georgia, serif"
        };
        $[18] = t12;
    } else {
        t12 = $[18];
    }
    let t13;
    if ($[19] !== greeting) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            style: t12,
            children: greeting
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 233,
            columnNumber: 11
        }, this);
        $[19] = greeting;
        $[20] = t13;
    } else {
        t13 = $[20];
    }
    let t14;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t14 = {
            fontSize: 13,
            color: "#525252",
            lineHeight: 1.8,
            margin: "0 0 24px",
            whiteSpace: "pre-wrap"
        };
        $[21] = t14;
    } else {
        t14 = $[21];
    }
    let t15;
    if ($[22] !== body) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            style: t14,
            children: body
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 254,
            columnNumber: 11
        }, this);
        $[22] = body;
        $[23] = t15;
    } else {
        t15 = $[23];
    }
    let t16;
    if ($[24] !== event.key) {
        t16 = event.key === "account_setup" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                background: "#171717",
                display: "inline-block",
                padding: "12px 20px",
                marginBottom: 24
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                style: {
                    color: "white",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase"
                },
                children: "Set Up Your Account →"
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 267,
                columnNumber: 8
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 262,
            columnNumber: 44
        }, this);
        $[24] = event.key;
        $[25] = t16;
    } else {
        t16 = $[25];
    }
    let t17;
    if ($[26] !== event.key) {
        t17 = event.key === "admin_new_order" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                background: "#171717",
                display: "inline-block",
                padding: "12px 20px",
                marginBottom: 24
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                style: {
                    color: "white",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase"
                },
                children: "View Order in Dashboard →"
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 285,
                columnNumber: 8
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 280,
            columnNumber: 46
        }, this);
        $[26] = event.key;
        $[27] = t17;
    } else {
        t17 = $[27];
    }
    let t18;
    let t19;
    if ($[28] === Symbol.for("react.memo_cache_sentinel")) {
        t18 = {
            borderTop: "1px solid #e5e5e5",
            paddingTop: 16
        };
        t19 = {
            fontSize: 10,
            color: "#a3a3a3",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            margin: 0
        };
        $[28] = t18;
        $[29] = t19;
    } else {
        t18 = $[28];
        t19 = $[29];
    }
    let t20;
    if ($[30] !== name) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: t18,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                style: t19,
                children: [
                    name,
                    " · Accra, Ghana"
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 318,
                columnNumber: 28
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 318,
            columnNumber: 11
        }, this);
        $[30] = name;
        $[31] = t20;
    } else {
        t20 = $[31];
    }
    let t21;
    if ($[32] !== t11 || $[33] !== t13 || $[34] !== t15 || $[35] !== t16 || $[36] !== t17 || $[37] !== t20 || $[38] !== t9) {
        t21 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: t6,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: t7,
                children: [
                    t9,
                    t11,
                    t13,
                    t15,
                    t16,
                    t17,
                    t20
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 326,
                columnNumber: 27
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 326,
            columnNumber: 11
        }, this);
        $[32] = t11;
        $[33] = t13;
        $[34] = t15;
        $[35] = t16;
        $[36] = t17;
        $[37] = t20;
        $[38] = t9;
        $[39] = t21;
    } else {
        t21 = $[39];
    }
    let t22;
    if ($[40] !== t21 || $[41] !== t5) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden text-xs",
            children: [
                t5,
                t21
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 340,
            columnNumber: 11
        }, this);
        $[40] = t21;
        $[41] = t5;
        $[42] = t22;
    } else {
        t22 = $[42];
    }
    return t22;
}
_c = EmailPreview;
function SmsPreview(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(17);
    if ($[0] !== "9b010d9700cec8679985d0ab3580c8724c7cb0a017c499e33ed9303eb8d150dc") {
        for(let $i = 0; $i < 17; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "9b010d9700cec8679985d0ab3580c8724c7cb0a017c499e33ed9303eb8d150dc";
    }
    const { template } = t0;
    let t1;
    if ($[1] !== template.body_text || $[2] !== template.greeting) {
        t1 = [
            template.greeting,
            template.body_text
        ].filter(Boolean).join(" ") || "Your SMS message will appear here.";
        $[1] = template.body_text;
        $[2] = template.greeting;
        $[3] = t1;
    } else {
        t1 = $[3];
    }
    const raw = t1;
    let t2;
    if ($[4] !== raw) {
        t2 = injectDummyVars(raw);
        $[4] = raw;
        $[5] = t2;
    } else {
        t2 = $[5];
    }
    const preview = t2;
    let t3;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border-b border-neutral-200 px-4 py-3 space-y-1",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[10px] text-neutral-400 uppercase tracking-widest",
                    children: "SMS Preview"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 381,
                    columnNumber: 84
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[10px] text-neutral-400",
                    children: "Variables shown with sample values"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 381,
                    columnNumber: 169
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 381,
            columnNumber: 10
        }, this);
        $[6] = t3;
    } else {
        t3 = $[6];
    }
    let t4;
    if ($[7] !== preview) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-6 flex justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-neutral-800 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[260px] text-sm leading-relaxed whitespace-pre-wrap",
                children: preview
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 388,
                columnNumber: 51
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 388,
            columnNumber: 10
        }, this);
        $[7] = preview;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    const t5 = `text-[10px] ${raw.length > 160 ? "text-red-500" : "text-neutral-400"}`;
    const t6 = raw.length;
    const t7 = Math.ceil(raw.length / 160);
    const t8 = Math.ceil(raw.length / 160) > 1 ? "s" : "";
    let t9;
    if ($[9] !== raw.length || $[10] !== t5 || $[11] !== t7 || $[12] !== t8) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "px-4 pb-4 text-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: t5,
                children: [
                    t6,
                    " chars · ",
                    t7,
                    " SMS credit",
                    t8
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 400,
                columnNumber: 49
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 400,
            columnNumber: 10
        }, this);
        $[9] = raw.length;
        $[10] = t5;
        $[11] = t7;
        $[12] = t8;
        $[13] = t9;
    } else {
        t9 = $[13];
    }
    let t10;
    if ($[14] !== t4 || $[15] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden",
            children: [
                t3,
                t4,
                t9
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 411,
            columnNumber: 11
        }, this);
        $[14] = t4;
        $[15] = t9;
        $[16] = t10;
    } else {
        t10 = $[16];
    }
    return t10;
}
_c1 = SmsPreview;
// ── ChannelTab ─────────────────────────────────────────────────────────────────
const TEMPLATE_VARS = [
    {
        key: "order_id",
        label: "{order_id}"
    },
    {
        key: "customer_name",
        label: "{customer_name}"
    },
    {
        key: "amount",
        label: "{amount}"
    },
    {
        key: "rider_name",
        label: "{rider_name}"
    },
    {
        key: "rider_phone",
        label: "{rider_phone}"
    }
];
function ChannelTab(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(87);
    if ($[0] !== "9b010d9700cec8679985d0ab3580c8724c7cb0a017c499e33ed9303eb8d150dc") {
        for(let $i = 0; $i < 87; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "9b010d9700cec8679985d0ab3580c8724c7cb0a017c499e33ed9303eb8d150dc";
    }
    const { channel, bizName, templates, onUpdate, onSave, saving, saved, selectedKey, onSelectKey } = t0;
    let t1;
    if ($[1] !== channel) {
        t1 = ({
            "ChannelTab[ALL_EVENTS.filter()]": (e)=>e.channels.includes(channel)
        })["ChannelTab[ALL_EVENTS.filter()]"];
        $[1] = channel;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const events = ALL_EVENTS.filter(t1);
    const selectedEvent = events.find({
        "ChannelTab[events.find()]": (e_0)=>e_0.key === selectedKey
    }["ChannelTab[events.find()]"]) ?? events[0];
    let t2;
    if ($[3] !== channel || $[4] !== selectedKey || $[5] !== templates) {
        t2 = templates.find({
            "ChannelTab[templates.find()]": (t)=>t.channel === channel && t.event_type === selectedKey
        }["ChannelTab[templates.find()]"]) ?? {
            channel,
            event_type: selectedKey,
            subject: "",
            greeting: "",
            body_text: ""
        };
        $[3] = channel;
        $[4] = selectedKey;
        $[5] = templates;
        $[6] = t2;
    } else {
        t2 = $[6];
    }
    const tpl = t2;
    const saveKey = `${channel}-${selectedKey}`;
    const bodyRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const insertVar = function insertVar(varLabel) {
        const el = bodyRef.current;
        if (!el) {
            return;
        }
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const newVal = el.value.slice(0, start) + varLabel + el.value.slice(end);
        onUpdate(selectedKey, "body_text", newVal);
        requestAnimationFrame({
            "ChannelTab[insertVar > requestAnimationFrame()]": ()=>{
                el.selectionStart = el.selectionEnd = start + varLabel.length;
                el.focus();
            }
        }["ChannelTab[insertVar > requestAnimationFrame()]"]);
    };
    const t3 = "grid grid-cols-1 lg:grid-cols-3 gap-8 items-start";
    let t4;
    if ($[7] !== onSelectKey || $[8] !== selectedKey) {
        t4 = ({
            "ChannelTab[events.map()]": (ev)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    onClick: {
                        "ChannelTab[events.map() > <button>.onClick]": ()=>onSelectKey(ev.key)
                    }["ChannelTab[events.map() > <button>.onClick]"],
                    className: `w-full text-left px-4 py-3 transition-colors border-l-2 ${selectedKey === ev.key ? "border-black bg-neutral-50 text-black" : "border-transparent text-neutral-500 hover:text-black hover:bg-neutral-50"}`,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs font-semibold uppercase tracking-widest",
                            children: ev.label
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 515,
                            columnNumber: 272
                        }, this),
                        ev.adminOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-[10px] text-neutral-400 uppercase tracking-widest",
                            children: "Admin only"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 515,
                            columnNumber: 366
                        }, this),
                        ev.previewTag && !ev.adminOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-[10px] text-neutral-400 uppercase tracking-widest",
                            children: ev.previewTag
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 515,
                            columnNumber: 492
                        }, this)
                    ]
                }, ev.key, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 513,
                    columnNumber: 41
                }, this)
        })["ChannelTab[events.map()]"];
        $[7] = onSelectKey;
        $[8] = selectedKey;
        $[9] = t4;
    } else {
        t4 = $[9];
    }
    const t5 = events.map(t4);
    let t6;
    if ($[10] !== t5) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-1",
            children: t5
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 526,
            columnNumber: 10
        }, this);
        $[10] = t5;
        $[11] = t6;
    } else {
        t6 = $[11];
    }
    const t7 = "space-y-6";
    const t8 = "bg-white border border-neutral-200 p-6 space-y-5";
    let t9;
    if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1",
            children: "Event"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 536,
            columnNumber: 10
        }, this);
        $[12] = t9;
    } else {
        t9 = $[12];
    }
    const t10 = selectedEvent?.label;
    let t11;
    if ($[13] !== t10) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-sm font-semibold",
            children: t10
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 544,
            columnNumber: 11
        }, this);
        $[13] = t10;
        $[14] = t11;
    } else {
        t11 = $[14];
    }
    const t12 = selectedEvent?.description;
    let t13;
    if ($[15] !== t12) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 mt-1 leading-relaxed",
            children: t12
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 553,
            columnNumber: 11
        }, this);
        $[15] = t12;
        $[16] = t13;
    } else {
        t13 = $[16];
    }
    let t14;
    if ($[17] !== t11 || $[18] !== t13) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t9,
                t11,
                t13
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 561,
            columnNumber: 11
        }, this);
        $[17] = t11;
        $[18] = t13;
        $[19] = t14;
    } else {
        t14 = $[19];
    }
    let t15;
    if ($[20] !== channel || $[21] !== onUpdate || $[22] !== selectedEvent?.label || $[23] !== selectedKey || $[24] !== tpl.subject) {
        t15 = channel === "email" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                    children: "Subject Line"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 570,
                    columnNumber: 39
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: tpl.subject ?? "",
                    onChange: {
                        "ChannelTab[<input>.onChange]": (e_1)=>onUpdate(selectedKey, "subject", e_1.target.value)
                    }["ChannelTab[<input>.onChange]"],
                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                    placeholder: `${selectedEvent?.label} — Miss Tokyo`
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 570,
                    columnNumber: 158
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 570,
            columnNumber: 34
        }, this);
        $[20] = channel;
        $[21] = onUpdate;
        $[22] = selectedEvent?.label;
        $[23] = selectedKey;
        $[24] = tpl.subject;
        $[25] = t15;
    } else {
        t15 = $[25];
    }
    let t16;
    if ($[26] === Symbol.for("react.memo_cache_sentinel")) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: "Greeting"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 584,
            columnNumber: 11
        }, this);
        $[26] = t16;
    } else {
        t16 = $[26];
    }
    const t17 = tpl.greeting ?? "";
    let t18;
    if ($[27] !== onUpdate || $[28] !== selectedKey) {
        t18 = ({
            "ChannelTab[<input>.onChange]": (e_2)=>onUpdate(selectedKey, "greeting", e_2.target.value)
        })["ChannelTab[<input>.onChange]"];
        $[27] = onUpdate;
        $[28] = selectedKey;
        $[29] = t18;
    } else {
        t18 = $[29];
    }
    const t19 = channel === "email" ? "Dear Customer," : "Miss Tokyo:";
    let t20;
    if ($[30] !== t17 || $[31] !== t18 || $[32] !== t19) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t16,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: t17,
                    onChange: t18,
                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                    placeholder: t19
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 604,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 604,
            columnNumber: 11
        }, this);
        $[30] = t17;
        $[31] = t18;
        $[32] = t19;
        $[33] = t20;
    } else {
        t20 = $[33];
    }
    const t21 = channel === "email" ? "Body Text" : "Message";
    let t22;
    if ($[34] !== t21) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: t21
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 615,
            columnNumber: 11
        }, this);
        $[34] = t21;
        $[35] = t22;
    } else {
        t22 = $[35];
    }
    const t23 = channel === "email" ? 5 : 3;
    let t24;
    if ($[36] !== onUpdate || $[37] !== selectedKey) {
        t24 = ({
            "ChannelTab[<textarea>.onChange]": (e_3)=>onUpdate(selectedKey, "body_text", e_3.target.value)
        })["ChannelTab[<textarea>.onChange]"];
        $[36] = onUpdate;
        $[37] = selectedKey;
        $[38] = t24;
    } else {
        t24 = $[38];
    }
    const t25 = channel === "email" ? "Your message body. Dynamic values like order ID and rider name are injected automatically." : "Short SMS message. Keep under 160 chars. Use variables below.";
    let t26;
    if ($[39] !== t23 || $[40] !== t24 || $[41] !== t25 || $[42] !== tpl.body_text) {
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
            ref: bodyRef,
            rows: t23,
            value: tpl.body_text,
            onChange: t24,
            className: "w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-y",
            placeholder: t25
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 636,
            columnNumber: 11
        }, this);
        $[39] = t23;
        $[40] = t24;
        $[41] = t25;
        $[42] = tpl.body_text;
        $[43] = t26;
    } else {
        t26 = $[43];
    }
    let t27;
    if ($[44] !== channel || $[45] !== tpl.body_text) {
        t27 = channel === "sms" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: `text-[10px] mt-1 tracking-wide ${tpl.body_text.length > 160 ? "text-red-500" : "text-neutral-400"}`,
            children: [
                tpl.body_text.length,
                " / 160 characters"
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 647,
            columnNumber: 32
        }, this);
        $[44] = channel;
        $[45] = tpl.body_text;
        $[46] = t27;
    } else {
        t27 = $[46];
    }
    let t28;
    if ($[47] !== t22 || $[48] !== t26 || $[49] !== t27) {
        t28 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t22,
                t26,
                t27
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 656,
            columnNumber: 11
        }, this);
        $[47] = t22;
        $[48] = t26;
        $[49] = t27;
        $[50] = t28;
    } else {
        t28 = $[50];
    }
    const t29 = "bg-neutral-50 border border-neutral-100 p-3 space-y-2";
    let t30;
    if ($[51] === Symbol.for("react.memo_cache_sentinel")) {
        t30 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
            children: "Available variables"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 667,
            columnNumber: 11
        }, this);
        $[51] = t30;
    } else {
        t30 = $[51];
    }
    const t31 = "flex flex-wrap gap-1.5";
    const t32 = TEMPLATE_VARS.map({
        "ChannelTab[TEMPLATE_VARS.map()]": (v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: {
                    "ChannelTab[TEMPLATE_VARS.map() > <button>.onClick]": ()=>insertVar(v.label)
                }["ChannelTab[TEMPLATE_VARS.map() > <button>.onClick]"],
                className: "font-mono text-[10px] px-2 py-1 bg-white border border-neutral-200 text-neutral-600 hover:border-black hover:text-black transition-colors rounded-sm",
                title: `Click to insert ${v.label}`,
                children: v.label
            }, v.key, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 674,
                columnNumber: 45
            }, this)
    }["ChannelTab[TEMPLATE_VARS.map()]"]);
    let t33;
    if ($[52] !== t32) {
        t33 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t31,
            children: t32
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 680,
            columnNumber: 11
        }, this);
        $[52] = t32;
        $[53] = t33;
    } else {
        t33 = $[53];
    }
    let t34;
    if ($[54] === Symbol.for("react.memo_cache_sentinel")) {
        t34 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400",
            children: "Click a variable to insert it at cursor position."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 688,
            columnNumber: 11
        }, this);
        $[54] = t34;
    } else {
        t34 = $[54];
    }
    let t35;
    if ($[55] !== t30 || $[56] !== t33) {
        t35 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t29,
            children: [
                t30,
                t33,
                t34
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 695,
            columnNumber: 11
        }, this);
        $[55] = t30;
        $[56] = t33;
        $[57] = t35;
    } else {
        t35 = $[57];
    }
    let t36;
    if ($[58] !== onSave || $[59] !== selectedKey) {
        t36 = ({
            "ChannelTab[<button>.onClick]": ()=>onSave(selectedKey)
        })["ChannelTab[<button>.onClick]"];
        $[58] = onSave;
        $[59] = selectedKey;
        $[60] = t36;
    } else {
        t36 = $[60];
    }
    const t37 = saving === saveKey;
    const t38 = saving === saveKey ? "Saving..." : "Save Template";
    let t39;
    if ($[61] !== t36 || $[62] !== t37 || $[63] !== t38) {
        t39 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            onClick: t36,
            disabled: t37,
            className: "px-6 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
            children: t38
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 717,
            columnNumber: 11
        }, this);
        $[61] = t36;
        $[62] = t37;
        $[63] = t38;
        $[64] = t39;
    } else {
        t39 = $[64];
    }
    let t40;
    if ($[65] !== saveKey || $[66] !== saved) {
        t40 = saved === saveKey && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-[10px] text-green-600 uppercase tracking-wider",
            children: "Saved"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 727,
            columnNumber: 32
        }, this);
        $[65] = saveKey;
        $[66] = saved;
        $[67] = t40;
    } else {
        t40 = $[67];
    }
    let t41;
    if ($[68] !== t39 || $[69] !== t40) {
        t41 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-4 pt-2",
            children: [
                t39,
                t40
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 736,
            columnNumber: 11
        }, this);
        $[68] = t39;
        $[69] = t40;
        $[70] = t41;
    } else {
        t41 = $[70];
    }
    let t42;
    if ($[71] !== t14 || $[72] !== t15 || $[73] !== t20 || $[74] !== t28 || $[75] !== t35 || $[76] !== t41) {
        t42 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t7,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: t8,
                children: [
                    t14,
                    t15,
                    t20,
                    t28,
                    t35,
                    t41
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 745,
                columnNumber: 31
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 745,
            columnNumber: 11
        }, this);
        $[71] = t14;
        $[72] = t15;
        $[73] = t20;
        $[74] = t28;
        $[75] = t35;
        $[76] = t41;
        $[77] = t42;
    } else {
        t42 = $[77];
    }
    let t43;
    if ($[78] !== bizName || $[79] !== channel || $[80] !== selectedEvent || $[81] !== tpl) {
        t43 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: channel === "email" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(EmailPreview, {
                event: selectedEvent,
                template: tpl,
                bizName: bizName
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 758,
                columnNumber: 39
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SmsPreview, {
                template: tpl
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 758,
                columnNumber: 113
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 758,
            columnNumber: 11
        }, this);
        $[78] = bizName;
        $[79] = channel;
        $[80] = selectedEvent;
        $[81] = tpl;
        $[82] = t43;
    } else {
        t43 = $[82];
    }
    let t44;
    if ($[83] !== t42 || $[84] !== t43 || $[85] !== t6) {
        t44 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t3,
            children: [
                t6,
                t42,
                t43
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
            lineNumber: 769,
            columnNumber: 11
        }, this);
        $[83] = t42;
        $[84] = t43;
        $[85] = t6;
        $[86] = t44;
    } else {
        t44 = $[86];
    }
    return t44;
}
_s(ChannelTab, "qeHx0POhuq8cYfEm72SdWZX2Xqs=");
_c2 = ChannelTab;
function EmailsTab() {
    _s1();
    const [channel, setChannel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("email");
    const [templates, setTemplates] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [bizName, setBizName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("Miss Tokyo");
    // Lifted selection state so test buttons know the active template
    const emailEvents = ALL_EVENTS.filter((e)=>e.channels.includes("email"));
    const smsEvents = ALL_EVENTS.filter((e_0)=>e_0.channels.includes("sms"));
    const [emailSelectedKey, setEmailSelectedKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(emailEvents[0]?.key ?? "");
    const [smsSelectedKey, setSmsSelectedKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(smsEvents[0]?.key ?? "");
    const selectedKey = channel === "email" ? emailSelectedKey : smsSelectedKey;
    const setSelectedKey = channel === "email" ? setEmailSelectedKey : setSmsSelectedKey;
    // Test send state
    const [emailModal, setEmailModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [smsModal, setSmsModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [testEmail, setTestEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [testPhone, setTestPhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [testSending, setTestSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Get the active template for the current selection
    function getActiveTpl(ch, key) {
        return templates.find((t)=>t.channel === ch && t.event_type === key) ?? {
            channel: ch,
            event_type: key,
            subject: "",
            greeting: "",
            body_text: ""
        };
    }
    async function sendTestEmail() {
        if (!testEmail.trim()) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Enter an email address");
            return;
        }
        const tpl = getActiveTpl("email", emailSelectedKey);
        const eventDef = ALL_EVENTS.find((e_1)=>e_1.key === emailSelectedKey);
        setTestSending(true);
        try {
            const res = await fetch("/api/admin/test-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: testEmail.trim(),
                    eventType: emailSelectedKey,
                    eventLabel: eventDef?.label ?? emailSelectedKey,
                    subject: tpl.subject || eventDef?.label || "Order Confirmed",
                    greeting: tpl.greeting || "Hello,",
                    bodyText: tpl.body_text || ""
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed");
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Test email sent!");
            setEmailModal(false);
            setTestEmail("");
        } catch (e_2) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(e_2.message || "Failed to send");
        } finally{
            setTestSending(false);
        }
    }
    async function sendTestSMS() {
        if (!testPhone.trim()) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Enter a phone number");
            return;
        }
        const tpl_0 = getActiveTpl("sms", smsSelectedKey);
        const message = injectDummyVars([
            tpl_0.greeting,
            tpl_0.body_text
        ].filter(Boolean).join(" ") || "Your Miss Tokyo order #TEST1234 is confirmed! Thank you.");
        setTestSending(true);
        try {
            const res_0 = await fetch("/api/admin/test-sms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    phone: testPhone.trim(),
                    message
                })
            });
            const json_0 = await res_0.json();
            if (!res_0.ok) throw new Error(json_0.error || "Failed");
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Test SMS sent!");
            setSmsModal(false);
            setTestPhone("");
        } catch (e_3) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(e_3.message || "Failed to send");
        } finally{
            setTestSending(false);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EmailsTab.useEffect": ()=>{
            Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("communication_templates").select("*"),
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("business_settings").select("business_name").eq("id", "default").single()
            ]).then({
                "EmailsTab.useEffect": ([{ data: tpls }, { data: biz }])=>{
                    setTemplates(tpls ?? []);
                    if (biz?.business_name) setBizName(biz.business_name);
                    setLoading(false);
                }
            }["EmailsTab.useEffect"]);
        }
    }["EmailsTab.useEffect"], []);
    const handleUpdate = (event_type, field, value)=>{
        setTemplates((prev)=>{
            const exists = prev.find((t_0)=>t_0.channel === channel && t_0.event_type === event_type);
            if (exists) {
                return prev.map((t_1)=>t_1.channel === channel && t_1.event_type === event_type ? {
                        ...t_1,
                        [field]: value
                    } : t_1);
            }
            return [
                ...prev,
                {
                    channel,
                    event_type,
                    subject: null,
                    greeting: "",
                    body_text: "",
                    [field]: value
                }
            ];
        });
    };
    const handleSave = async (event_type_0)=>{
        const tpl_1 = templates.find((t_2)=>t_2.channel === channel && t_2.event_type === event_type_0) ?? {
            channel,
            event_type: event_type_0,
            subject: null,
            greeting: "",
            body_text: ""
        };
        const key_0 = `${channel}-${event_type_0}`;
        setSaving(key_0);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("communication_templates").upsert({
            ...tpl_1,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "channel,event_type"
        });
        setSaving(null);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to save template.");
        } else {
            setSaved(key_0);
            setTimeout(()=>setSaved(null), 3000);
        }
    };
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-neutral-400 italic font-serif",
        children: "Loading..."
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
        lineNumber: 935,
        columnNumber: 23
    }, this);
    const activeEmailEventLabel = ALL_EVENTS.find((e_4)=>e_4.key === emailSelectedKey)?.label ?? "Email";
    const activeSmsEventLabel = ALL_EVENTS.find((e_5)=>e_5.key === smsSelectedKey)?.label ?? "SMS";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-neutral-500",
                        children: "Edit transactional message templates and send test notifications."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 941,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setEmailModal(true),
                                className: "flex items-center gap-1.5 px-3 py-2 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                        size: 12
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                        lineNumber: 944,
                                        columnNumber: 25
                                    }, this),
                                    " Test Email"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 943,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setSmsModal(true),
                                className: "flex items-center gap-1.5 px-3 py-2 border border-neutral-300 text-neutral-600 text-[10px] uppercase tracking-widest hover:bg-neutral-50 transition-colors",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"], {
                                        size: 12
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                        lineNumber: 947,
                                        columnNumber: 25
                                    }, this),
                                    " Test SMS"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 946,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 942,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 940,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-0 border-b border-neutral-200",
                children: [
                    "email",
                    "sms"
                ].map((ch_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setChannel(ch_0),
                        className: `px-8 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors ${channel === ch_0 ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`,
                        children: ch_0 === "email" ? "Email Templates" : "SMS Templates"
                    }, ch_0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 954,
                        columnNumber: 62
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 953,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ChannelTab, {
                channel: channel,
                bizName: bizName,
                templates: templates,
                onUpdate: handleUpdate,
                onSave: handleSave,
                saving: saving,
                saved: saved,
                selectedKey: selectedKey,
                onSelectKey: setSelectedKey
            }, channel, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 959,
                columnNumber: 13
            }, this),
            emailModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white w-full max-w-md mx-4 p-8 rounded-2xl shadow-xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between mb-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "font-semibold text-base",
                                    children: "Send Test Email"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 965,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setEmailModal(false),
                                    className: "text-neutral-400 hover:text-black",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                        lineNumber: 966,
                                        columnNumber: 134
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 966,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 964,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-neutral-500 mb-1",
                            children: [
                                "Sending: ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-semibold text-black",
                                    children: activeEmailEventLabel
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 969,
                                    columnNumber: 38
                                }, this),
                                " template with dummy data."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 968,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[10px] text-neutral-400 mb-5",
                            children: [
                                "Variables like ",
                                "{order_id}",
                                " and ",
                                "{customer_name}",
                                " will be replaced with test values."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 971,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "block text-xs uppercase tracking-widest text-neutral-500 mb-1.5",
                            children: "Email Address"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 974,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "email",
                            value: testEmail,
                            onChange: (e_6)=>setTestEmail(e_6.target.value),
                            onKeyDown: (e_7)=>e_7.key === "Enter" && sendTestEmail(),
                            placeholder: "you@example.com",
                            autoFocus: true,
                            className: "w-full border border-neutral-200 px-3 py-2.5 text-sm rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-black/10"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 975,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setEmailModal(false),
                                    className: "flex-1 border border-neutral-200 py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-50",
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 977,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: sendTestEmail,
                                    disabled: testSending,
                                    className: "flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                            size: 13
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                            lineNumber: 979,
                                            columnNumber: 33
                                        }, this),
                                        testSending ? "Sending…" : "Send Test"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 978,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 976,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 963,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 962,
                columnNumber: 28
            }, this),
            smsModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white w-full max-w-md mx-4 p-8 rounded-2xl shadow-xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between mb-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "font-semibold text-base",
                                    children: "Send Test SMS"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 989,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setSmsModal(false),
                                    className: "text-neutral-400 hover:text-black",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                        lineNumber: 990,
                                        columnNumber: 132
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 990,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 988,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-neutral-500 mb-5",
                            children: [
                                "Sending: ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-semibold text-black",
                                    children: activeSmsEventLabel
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 993,
                                    columnNumber: 38
                                }, this),
                                " template via MNotify."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 992,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "block text-xs uppercase tracking-widest text-neutral-500 mb-1.5",
                            children: "Phone Number"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 995,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "tel",
                            value: testPhone,
                            onChange: (e_8)=>setTestPhone(e_8.target.value),
                            onKeyDown: (e_9)=>e_9.key === "Enter" && sendTestSMS(),
                            placeholder: "0200000000 or +233200000000",
                            autoFocus: true,
                            className: "w-full border border-neutral-200 px-3 py-2.5 text-sm rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 996,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[10px] text-neutral-400 mb-6",
                            children: "Ghana numbers only. Format: 0XXXXXXXXX or +233XXXXXXXXX"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 997,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setSmsModal(false),
                                    className: "flex-1 border border-neutral-200 py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-50",
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 999,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: sendTestSMS,
                                    disabled: testSending,
                                    className: "flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                            size: 13
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                            lineNumber: 1001,
                                            columnNumber: 33
                                        }, this),
                                        testSending ? "Sending…" : "Send Test"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 1000,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 998,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 987,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 986,
                columnNumber: 26
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
        lineNumber: 938,
        columnNumber: 10
    }, this);
}
_s1(EmailsTab, "yg4mEjd2PBblwj/LAJsK4q1vDkI=");
_c3 = EmailsTab;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "EmailPreview");
__turbopack_context__.k.register(_c1, "SmsPreview");
__turbopack_context__.k.register(_c2, "ChannelTab");
__turbopack_context__.k.register(_c3, "EmailsTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/NotificationsTab.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NotificationsTab",
    ()=>NotificationsTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BellOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell-off.js [app-client] (ecmascript) <export default as BellOff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rss$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Rss$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/rss.js [app-client] (ecmascript) <export default as Rss>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/send.js [app-client] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const TEMPLATE_VARS = [
    {
        label: "{order_id}",
        desc: "Order reference"
    },
    {
        label: "{customer_name}",
        desc: "Customer first name"
    },
    {
        label: "{amount}",
        desc: "Order total in GH₵"
    }
];
const DEFAULT_TITLE = "New Order Received!";
const DEFAULT_BODY = "Order #{order_id} for {amount} from {customer_name} has been paid.";
function loadSwRegistration() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return Promise.resolve(null);
    return navigator.serviceWorker.ready;
}
async function subscribeToPush() {
    const reg = await loadSwRegistration();
    if (!reg) return null;
    const vapidKey = ("TURBOPACK compile-time value", "BDlpSwqVW4J83mcFbzyc63WK-zDBsxbFdis6whW6aU_ChHbV_4O9qArS269-ECM-n47mhT-YLOVcDlFgrX0IuFY");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Convert base64 VAPID key to Uint8Array
    const raw = atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/"));
    const uint8 = new Uint8Array(raw.length);
    for(let i = 0; i < raw.length; i++)uint8[i] = raw.charCodeAt(i);
    return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: uint8
    });
}
function NotificationsTab() {
    _s();
    const [supported, setSupported] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [permission, setPermission] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("default");
    const [subscribed, setSubscribed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [template, setTemplate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        title: DEFAULT_TITLE,
        body: DEFAULT_BODY
    });
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [testSending, setTestSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [vapidConfigured, setVapidConfigured] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "NotificationsTab.useState": ()=>!!("TURBOPACK compile-time value", "BDlpSwqVW4J83mcFbzyc63WK-zDBsxbFdis6whW6aU_ChHbV_4O9qArS269-ECM-n47mhT-YLOVcDlFgrX0IuFY")
    }["NotificationsTab.useState"]);
    const baseUrl = ("TURBOPACK compile-time value", "http://localhost:3000") || "https://misstokyo.shop";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationsTab.useEffect": ()=>{
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                setSupported(false);
                return;
            }
            setPermission(Notification.permission);
            setVapidConfigured(!!("TURBOPACK compile-time value", "BDlpSwqVW4J83mcFbzyc63WK-zDBsxbFdis6whW6aU_ChHbV_4O9qArS269-ECM-n47mhT-YLOVcDlFgrX0IuFY"));
            // Register SW if not already registered
            navigator.serviceWorker.register("/sw.js").catch(console.error);
            // Check existing subscription
            navigator.serviceWorker.ready.then({
                "NotificationsTab.useEffect": (reg)=>reg.pushManager.getSubscription()
            }["NotificationsTab.useEffect"]).then({
                "NotificationsTab.useEffect": (sub)=>{
                    setSubscribed(!!sub);
                }
            }["NotificationsTab.useEffect"]);
            // Load saved template
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("push_notification_settings").select("title, body").eq("id", "default").maybeSingle().then({
                "NotificationsTab.useEffect": ({ data })=>{
                    if (data) setTemplate({
                        title: data.title || DEFAULT_TITLE,
                        body: data.body || DEFAULT_BODY
                    });
                }
            }["NotificationsTab.useEffect"]);
        }
    }["NotificationsTab.useEffect"], []);
    async function handleSubscribe() {
        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== "granted") {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Notification permission denied. Please allow notifications in your browser settings.");
                return;
            }
            const sub_0 = await subscribeToPush();
            if (!sub_0) {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to subscribe — check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local");
                return;
            }
            const res = await fetch("/api/admin/push/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    subscription: sub_0.toJSON()
                })
            });
            if (!res.ok) {
                const j = await res.json();
                throw new Error(j.error || "Subscribe failed");
            }
            setSubscribed(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Desktop notifications enabled!");
        } catch (err) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(err.message || "Failed to enable notifications");
        } finally{
            setLoading(false);
        }
    }
    async function handleUnsubscribe() {
        setLoading(true);
        try {
            const reg_0 = await navigator.serviceWorker.ready;
            const sub_1 = await reg_0.pushManager.getSubscription();
            if (sub_1) {
                await fetch("/api/admin/push/subscribe", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        endpoint: sub_1.endpoint
                    })
                });
                await sub_1.unsubscribe();
            }
            setSubscribed(false);
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Notifications disabled.");
        } catch (err_0) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(err_0.message || "Failed to unsubscribe");
        } finally{
            setLoading(false);
        }
    }
    async function handleSaveTemplate() {
        setSaving(true);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("push_notification_settings").upsert({
            id: "default",
            title: template.title,
            body: template.body
        }, {
            onConflict: "id"
        });
        setSaving(false);
        if (error) __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to save template");
        else __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Template saved");
    }
    async function handleTestNotification() {
        if (!subscribed) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Enable notifications first");
            return;
        }
        setTestSending(true);
        try {
            const perm_0 = Notification.permission;
            if (perm_0 !== "granted") {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Notification permission is not granted");
                return;
            }
            const reg_1 = await navigator.serviceWorker.ready;
            const body = (template.body || DEFAULT_BODY).replace("{order_id}", "TEST1234").replace("{customer_name}", "Test Customer").replace("{amount}", "GH₵ 1,200.00");
            await reg_1.showNotification(template.title || DEFAULT_TITLE, {
                body,
                tag: "mt-test",
                data: {
                    url: "/sales/orders"
                },
                requireInteraction: false
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Test notification sent! Check your system notifications.");
        } catch (err_1) {
            console.error("[push test]", err_1);
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(err_1.message || "Failed — check browser notification permissions");
        } finally{
            setTestSending(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-10 max-w-2xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-start justify-between gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xs font-semibold uppercase tracking-widest mb-1",
                                        children: "Desktop Notifications"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 196,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] text-neutral-500 leading-relaxed",
                                        children: "Get a browser desktop notification instantly when a new order is placed. Each admin browser must subscribe separately."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 197,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 195,
                                columnNumber: 21
                            }, this),
                            subscribed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                size: 20,
                                className: "text-emerald-500 shrink-0 mt-0.5"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 202,
                                columnNumber: 35
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                size: 20,
                                className: "text-neutral-300 shrink-0 mt-0.5"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 202,
                                columnNumber: 109
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 194,
                        columnNumber: 17
                    }, this),
                    !supported && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] text-amber-700 rounded-sm",
                        children: "Your browser doesn't support Web Push notifications."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 205,
                        columnNumber: 32
                    }, this),
                    supported && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            !vapidConfigured && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-amber-50 border border-amber-200 px-4 py-3 rounded-sm space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] font-semibold text-amber-700 uppercase tracking-widest",
                                        children: "VAPID Key Not Configured"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 211,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] text-amber-600 leading-relaxed",
                                        children: [
                                            "Push notifications require ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                className: "bg-amber-100 px-1 rounded",
                                                children: "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                lineNumber: 213,
                                                columnNumber: 64
                                            }, this),
                                            " and ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                className: "bg-amber-100 px-1 rounded",
                                                children: "VAPID_PRIVATE_KEY"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                lineNumber: 213,
                                                columnNumber: 148
                                            }, this),
                                            " in your environment variables. Generate them using the setup instructions below."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 212,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 210,
                                columnNumber: 46
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `w-2 h-2 rounded-full ${subscribed ? "bg-emerald-400" : "bg-neutral-300"}`
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 217,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-neutral-600",
                                        children: subscribed ? "Subscribed on this device" : "Not subscribed on this device"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 218,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 216,
                                columnNumber: 25
                            }, this),
                            permission === "denied" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[11px] text-red-500",
                                children: "Notifications are blocked. Open browser settings → Site Settings → Notifications and allow this site."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 223,
                                columnNumber: 53
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-3",
                                children: !subscribed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handleSubscribe,
                                    disabled: loading || permission === "denied" || !supported,
                                    className: "flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-40",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                            size: 12
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                            lineNumber: 229,
                                            columnNumber: 37
                                        }, this),
                                        loading ? "Subscribing…" : "Enable Notifications"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                    lineNumber: 228,
                                    columnNumber: 44
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleTestNotification,
                                            disabled: testSending,
                                            className: "flex items-center gap-2 px-4 py-2.5 border border-neutral-300 text-neutral-600 text-[10px] uppercase tracking-widest hover:bg-neutral-50 transition-colors disabled:opacity-40",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                                    size: 12
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                    lineNumber: 233,
                                                    columnNumber: 41
                                                }, this),
                                                testSending ? "Sending…" : "Send Test"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                            lineNumber: 232,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleUnsubscribe,
                                            disabled: loading,
                                            className: "flex items-center gap-2 px-4 py-2.5 border border-neutral-200 text-neutral-400 text-[10px] uppercase tracking-widest hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BellOff$3e$__["BellOff"], {
                                                    size: 12
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                    lineNumber: 237,
                                                    columnNumber: 41
                                                }, this),
                                                "Disable"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                            lineNumber: 236,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 227,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border-t border-neutral-100 pt-4 space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 uppercase tracking-widest font-semibold",
                                        children: "Setup"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 244,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-500 leading-relaxed",
                                        children: [
                                            "Generate VAPID keys once and add to ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                className: "bg-neutral-100 px-1 rounded",
                                                children: ".env.local"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                lineNumber: 246,
                                                columnNumber: 69
                                            }, this),
                                            ":"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 245,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                                        className: "text-[10px] bg-neutral-50 border border-neutral-100 p-3 rounded text-neutral-600 overflow-x-auto leading-relaxed",
                                        children: `npx web-push generate-vapid-keys

NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
VAPID_PRIVATE_KEY=<privateKey>
VAPID_SUBJECT=mailto:admin@misstokyo.shop`
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 248,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 243,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                lineNumber: 193,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest mb-1",
                                children: "Notification Template"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 260,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[11px] text-neutral-500",
                                children: "Customise what appears in the desktop push notification for new orders."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 261,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 259,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                children: "Title"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 265,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                value: template.title,
                                onChange: (e)=>setTemplate((t)=>({
                                            ...t,
                                            title: e.target.value
                                        })),
                                placeholder: DEFAULT_TITLE,
                                className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 266,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 264,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                children: "Body"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 273,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                rows: 3,
                                value: template.body,
                                onChange: (e_0)=>setTemplate((t_0)=>({
                                            ...t_0,
                                            body: e_0.target.value
                                        })),
                                placeholder: DEFAULT_BODY,
                                className: "w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-none"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 274,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 272,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-neutral-50 border border-neutral-100 p-3 space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                children: "Available variables"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 281,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap gap-2",
                                children: TEMPLATE_VARS.map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-mono text-[10px] px-2 py-1 bg-white border border-neutral-200 text-neutral-600 rounded-sm",
                                        children: [
                                            v.label,
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-neutral-400",
                                                children: [
                                                    "— ",
                                                    v.desc
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                lineNumber: 284,
                                                columnNumber: 43
                                            }, this)
                                        ]
                                    }, v.label, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 283,
                                        columnNumber: 49
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 282,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 280,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: handleSaveTemplate,
                        disabled: saving,
                        className: "px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                        children: saving ? "Saving…" : "Save Template"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 289,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                lineNumber: 258,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-start gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rss$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Rss$3e$__["Rss"], {
                                size: 18,
                                className: "text-orange-400 shrink-0 mt-0.5"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 297,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xs font-semibold uppercase tracking-widest mb-1",
                                        children: "RSS Feed — New Arrivals"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 299,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] text-neutral-500 leading-relaxed",
                                        children: "A public RSS feed of your 20 most recent active products. Automatically updates every hour. Share this link with customers or plug it into RSS readers and aggregators."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 300,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 298,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 296,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2 bg-neutral-50 border border-neutral-100 px-3 py-2.5 rounded-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                className: "text-xs text-neutral-700 flex-1 break-all",
                                children: [
                                    baseUrl,
                                    "/rss.xml"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 308,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>{
                                    navigator.clipboard.writeText(`${baseUrl}/rss.xml`);
                                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Copied!");
                                },
                                className: "text-[10px] uppercase tracking-widest text-neutral-500 hover:text-black transition-colors whitespace-nowrap",
                                children: "Copy"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 309,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 307,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-neutral-400",
                        children: "Excludes wholesale-only products. Only published (active) products appear."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 317,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                lineNumber: 295,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
        lineNumber: 190,
        columnNumber: 10
    }, this);
}
_s(NotificationsTab, "fz5cX36AihdQFXz23CUQ0mRpA1U=");
_c = NotificationsTab;
var _c;
__turbopack_context__.k.register(_c, "NotificationsTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/RidersTab.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RidersTab",
    ()=>RidersTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/ImageUploader.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/pencil.js [app-client] (ecmascript) <export default as Pencil>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const EMPTY_FORM = {
    full_name: "",
    phone_number: "",
    bike_reg: "",
    image_url: ""
};
function RidersTab() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(45);
    if ($[0] !== "cfe76ea92fb78d6ebe0ce3aa62c68c0e1fb6dd406ebf49ca64affba065f941bd") {
        for(let $i = 0; $i < 45; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "cfe76ea92fb78d6ebe0ce3aa62c68c0e1fb6dd406ebf49ca64affba065f941bd";
    }
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = [];
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    const [riders, setRiders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t0);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isAdding, setIsAdding] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(EMPTY_FORM);
    const [editingId, setEditingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editForm, setEditForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(EMPTY_FORM);
    const [confirmDeleteId, setConfirmDeleteId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = ({
            "RidersTab[fetch]": async ()=>{
                setLoading(true);
                const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("riders").select("*").order("full_name");
                if (data) {
                    setRiders(data);
                }
                setLoading(false);
            }
        })["RidersTab[fetch]"];
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const fetch = t1;
    let t2;
    let t3;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "RidersTab[useEffect()]": ()=>{
                fetch();
            }
        })["RidersTab[useEffect()]"];
        t3 = [];
        $[3] = t2;
        $[4] = t3;
    } else {
        t2 = $[3];
        t3 = $[4];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t2, t3);
    let t4;
    if ($[5] !== form.bike_reg || $[6] !== form.full_name || $[7] !== form.image_url || $[8] !== form.phone_number) {
        t4 = ({
            "RidersTab[handleAdd]": async (e)=>{
                e.preventDefault();
                if (!form.full_name || !form.phone_number) {
                    return;
                }
                setSaving(true);
                const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("riders").insert([
                    {
                        full_name: form.full_name,
                        phone_number: form.phone_number,
                        bike_reg: form.bike_reg || null,
                        image_url: form.image_url || null,
                        is_active: true
                    }
                ]);
                if (error) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to add rider.");
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Rider added.");
                    setForm(EMPTY_FORM);
                    setIsAdding(false);
                    await fetch();
                }
                setSaving(false);
            }
        })["RidersTab[handleAdd]"];
        $[5] = form.bike_reg;
        $[6] = form.full_name;
        $[7] = form.image_url;
        $[8] = form.phone_number;
        $[9] = t4;
    } else {
        t4 = $[9];
    }
    const handleAdd = t4;
    let t5;
    if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = ({
            "RidersTab[startEdit]": (r)=>{
                setEditingId(r.id);
                setEditForm({
                    full_name: r.full_name,
                    phone_number: r.phone_number,
                    bike_reg: r.bike_reg || "",
                    image_url: r.image_url || ""
                });
            }
        })["RidersTab[startEdit]"];
        $[10] = t5;
    } else {
        t5 = $[10];
    }
    const startEdit = t5;
    let t6;
    if ($[11] !== editForm) {
        t6 = ({
            "RidersTab[handleSaveEdit]": async (id)=>{
                setSaving(true);
                const { error: error_0 } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("riders").update({
                    full_name: editForm.full_name,
                    phone_number: editForm.phone_number,
                    bike_reg: editForm.bike_reg || null,
                    image_url: editForm.image_url || null
                }).eq("id", id);
                if (error_0) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to update rider.");
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Rider updated.");
                    setEditingId(null);
                    await fetch();
                }
                setSaving(false);
            }
        })["RidersTab[handleSaveEdit]"];
        $[11] = editForm;
        $[12] = t6;
    } else {
        t6 = $[12];
    }
    const handleSaveEdit = t6;
    let t7;
    if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = ({
            "RidersTab[toggleActive]": async (id_0, is_active)=>{
                setRiders({
                    "RidersTab[toggleActive > setRiders()]": (prev)=>prev.map({
                            "RidersTab[toggleActive > setRiders() > prev.map()]": (r_0)=>r_0.id === id_0 ? {
                                    ...r_0,
                                    is_active: !is_active
                                } : r_0
                        }["RidersTab[toggleActive > setRiders() > prev.map()]"])
                }["RidersTab[toggleActive > setRiders()]"]);
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("riders").update({
                    is_active: !is_active
                }).eq("id", id_0);
            }
        })["RidersTab[toggleActive]"];
        $[13] = t7;
    } else {
        t7 = $[13];
    }
    const toggleActive = t7;
    let t8;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = ({
            "RidersTab[handleDelete]": async (id_1)=>{
                const { error: error_1 } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("riders").delete().eq("id", id_1);
                if (error_1) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to delete rider.");
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Rider removed.");
                    setRiders({
                        "RidersTab[handleDelete > setRiders()]": (prev_0)=>prev_0.filter({
                                "RidersTab[handleDelete > setRiders() > prev_0.filter()]": (r_1)=>r_1.id !== id_1
                            }["RidersTab[handleDelete > setRiders() > prev_0.filter()]"])
                    }["RidersTab[handleDelete > setRiders()]"]);
                }
                setConfirmDeleteId(null);
            }
        })["RidersTab[handleDelete]"];
        $[14] = t8;
    } else {
        t8 = $[14];
    }
    const handleDelete = t8;
    let t9;
    if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "text-xs font-semibold uppercase tracking-widest",
                    children: "Rider Profiles"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 222,
                    columnNumber: 15
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[10px] text-neutral-400 mt-1 uppercase tracking-widest",
                    children: "Manage delivery riders for dispatch assignment."
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 222,
                    columnNumber: 98
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 222,
            columnNumber: 10
        }, this);
        $[15] = t9;
    } else {
        t9 = $[15];
    }
    let t10;
    if ($[16] !== isAdding) {
        t10 = ({
            "RidersTab[<button>.onClick]": ()=>setIsAdding(!isAdding)
        })["RidersTab[<button>.onClick]"];
        $[16] = isAdding;
        $[17] = t10;
    } else {
        t10 = $[17];
    }
    let t11;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
            size: 13
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 239,
            columnNumber: 11
        }, this);
        $[18] = t11;
    } else {
        t11 = $[18];
    }
    const t12 = isAdding ? "Cancel" : "Add Rider";
    let t13;
    if ($[19] !== t10 || $[20] !== t12) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between",
            children: [
                t9,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: t10,
                    className: "flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors",
                    children: [
                        t11,
                        " ",
                        t12
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 247,
                    columnNumber: 66
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 247,
            columnNumber: 11
        }, this);
        $[19] = t10;
        $[20] = t12;
        $[21] = t13;
    } else {
        t13 = $[21];
    }
    let t14;
    if ($[22] !== form.bike_reg || $[23] !== form.full_name || $[24] !== form.image_url || $[25] !== form.phone_number || $[26] !== handleAdd || $[27] !== isAdding || $[28] !== saving) {
        t14 = isAdding && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: handleAdd,
            className: "bg-white border border-neutral-200 p-8 space-y-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                    children: "New Rider"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 256,
                    columnNumber: 111
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Full Name *"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 256,
                                            columnNumber: 309
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            required: true,
                                            value: form.full_name,
                                            onChange: {
                                                "RidersTab[<input>.onChange]": (e_0)=>setForm({
                                                        "RidersTab[<input>.onChange > setForm()]": (p)=>({
                                                                ...p,
                                                                full_name: e_0.target.value
                                                            })
                                                    }["RidersTab[<input>.onChange > setForm()]"])
                                            }["RidersTab[<input>.onChange]"],
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                            placeholder: "Kwame Asante"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 256,
                                            columnNumber: 427
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 256,
                                    columnNumber: 304
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Phone Number *"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 263,
                                            columnNumber: 204
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            required: true,
                                            value: form.phone_number,
                                            onChange: {
                                                "RidersTab[<input>.onChange]": (e_1)=>setForm({
                                                        "RidersTab[<input>.onChange > setForm()]": (p_0)=>({
                                                                ...p_0,
                                                                phone_number: e_1.target.value
                                                            })
                                                    }["RidersTab[<input>.onChange > setForm()]"])
                                            }["RidersTab[<input>.onChange]"],
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                            placeholder: "+233 20 000 0000"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 263,
                                            columnNumber: 325
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 263,
                                    columnNumber: 199
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Bike Registration"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 270,
                                            columnNumber: 208
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: form.bike_reg,
                                            onChange: {
                                                "RidersTab[<input>.onChange]": (e_2)=>setForm({
                                                        "RidersTab[<input>.onChange > setForm()]": (p_1)=>({
                                                                ...p_1,
                                                                bike_reg: e_2.target.value
                                                            })
                                                    }["RidersTab[<input>.onChange > setForm()]"])
                                            }["RidersTab[<input>.onChange]"],
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                            placeholder: "GR-1234-23"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 270,
                                            columnNumber: 332
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 270,
                                    columnNumber: 203
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 256,
                            columnNumber: 277
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ImageUploader"], {
                                bucket: "product-images",
                                folder: "riders",
                                currentUrl: form.image_url || null,
                                onUpload: {
                                    "RidersTab[<ImageUploader>.onUpload]": (url)=>setForm({
                                            "RidersTab[<ImageUploader>.onUpload > setForm()]": (p_2)=>({
                                                    ...p_2,
                                                    image_url: url
                                                })
                                        }["RidersTab[<ImageUploader>.onUpload > setForm()]"])
                                }["RidersTab[<ImageUploader>.onUpload]"],
                                aspectRatio: "square",
                                label: "Rider Photo"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 277,
                                columnNumber: 208
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 277,
                            columnNumber: 203
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 256,
                    columnNumber: 222
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-end border-t border-neutral-100 pt-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "submit",
                        disabled: saving,
                        className: "px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50",
                        children: saving ? "Saving..." : "Add Rider"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 284,
                        columnNumber: 175
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 284,
                    columnNumber: 108
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 256,
            columnNumber: 23
        }, this);
        $[22] = form.bike_reg;
        $[23] = form.full_name;
        $[24] = form.image_url;
        $[25] = form.phone_number;
        $[26] = handleAdd;
        $[27] = isAdding;
        $[28] = saving;
        $[29] = t14;
    } else {
        t14 = $[29];
    }
    let t15;
    if ($[30] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
            className: "bg-neutral-50 border-b border-neutral-200",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 w-16",
                        children: "Photo"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 298,
                        columnNumber: 76
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500",
                        children: "Name"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 298,
                        columnNumber: 182
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500",
                        children: "Phone"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 298,
                        columnNumber: 282
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500",
                        children: "Bike Reg"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 298,
                        columnNumber: 383
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500",
                        children: "Status"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 298,
                        columnNumber: 487
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 w-20"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 298,
                        columnNumber: 589
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                lineNumber: 298,
                columnNumber: 72
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 298,
            columnNumber: 11
        }, this);
        $[30] = t15;
    } else {
        t15 = $[30];
    }
    let t16;
    if ($[31] !== confirmDeleteId || $[32] !== editForm || $[33] !== editingId || $[34] !== handleSaveEdit || $[35] !== loading || $[36] !== riders || $[37] !== saving) {
        t16 = loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                colSpan: 6,
                className: "px-6 py-12 text-center text-neutral-400 italic font-serif",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                lineNumber: 305,
                columnNumber: 25
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 305,
            columnNumber: 21
        }, this) : riders.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                colSpan: 6,
                className: "px-6 py-12 text-center text-neutral-400 italic font-serif",
                children: "No riders yet. Add your first above."
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                lineNumber: 305,
                columnNumber: 160
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 305,
            columnNumber: 156
        }, this) : riders.map({
            "RidersTab[riders.map()]": (rider)=>editingId === rider.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                    className: "bg-neutral-50",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-12 h-12",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ImageUploader"], {
                                    bucket: "product-images",
                                    folder: "riders",
                                    currentUrl: editForm.image_url || null,
                                    onUpload: {
                                        "RidersTab[riders.map() > <ImageUploader>.onUpload]": (url_0)=>setEditForm({
                                                "RidersTab[riders.map() > <ImageUploader>.onUpload > setEditForm()]": (p_3)=>({
                                                        ...p_3,
                                                        image_url: url_0
                                                    })
                                            }["RidersTab[riders.map() > <ImageUploader>.onUpload > setEditForm()]"])
                                    }["RidersTab[riders.map() > <ImageUploader>.onUpload]"],
                                    aspectRatio: "square",
                                    label: ""
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 306,
                                    columnNumber: 166
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 306,
                                columnNumber: 139
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 306,
                            columnNumber: 113
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                value: editForm.full_name,
                                onChange: {
                                    "RidersTab[riders.map() > <input>.onChange]": (e_3)=>setEditForm({
                                            "RidersTab[riders.map() > <input>.onChange > setEditForm()]": (p_4)=>({
                                                    ...p_4,
                                                    full_name: e_3.target.value
                                                })
                                        }["RidersTab[riders.map() > <input>.onChange > setEditForm()]"])
                                }["RidersTab[riders.map() > <input>.onChange]"],
                                className: "border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 313,
                                columnNumber: 139
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 313,
                            columnNumber: 113
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                value: editForm.phone_number,
                                onChange: {
                                    "RidersTab[riders.map() > <input>.onChange]": (e_4)=>setEditForm({
                                            "RidersTab[riders.map() > <input>.onChange > setEditForm()]": (p_5)=>({
                                                    ...p_5,
                                                    phone_number: e_4.target.value
                                                })
                                        }["RidersTab[riders.map() > <input>.onChange > setEditForm()]"])
                                }["RidersTab[riders.map() > <input>.onChange]"],
                                className: "border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 320,
                                columnNumber: 192
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 320,
                            columnNumber: 166
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                value: editForm.bike_reg,
                                onChange: {
                                    "RidersTab[riders.map() > <input>.onChange]": (e_5)=>setEditForm({
                                            "RidersTab[riders.map() > <input>.onChange > setEditForm()]": (p_6)=>({
                                                    ...p_6,
                                                    bike_reg: e_5.target.value
                                                })
                                        }["RidersTab[riders.map() > <input>.onChange > setEditForm()]"])
                                }["RidersTab[riders.map() > <input>.onChange]"],
                                className: "border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full font-mono text-xs"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 327,
                                columnNumber: 192
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 327,
                            columnNumber: 166
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4 text-xs text-neutral-400 italic",
                            children: "editing"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 334,
                            columnNumber: 184
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3 justify-end",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: {
                                            "RidersTab[riders.map() > <button>.onClick]": ()=>handleSaveEdit(rider.id)
                                        }["RidersTab[riders.map() > <button>.onClick]"],
                                        disabled: saving,
                                        className: "text-green-600 hover:text-green-800 disabled:opacity-50",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                            size: 16
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 336,
                                            columnNumber: 148
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 334,
                                        columnNumber: 333
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: {
                                            "RidersTab[riders.map() > <button>.onClick]": ()=>setEditingId(null)
                                        }["RidersTab[riders.map() > <button>.onClick]"],
                                        className: "text-neutral-400 hover:text-black",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                            size: 16
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 338,
                                            columnNumber: 108
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 336,
                                        columnNumber: 176
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 334,
                                columnNumber: 280
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 334,
                            columnNumber: 254
                        }, this)
                    ]
                }, rider.id, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 306,
                    columnNumber: 68
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                    className: "hover:bg-neutral-50 transition-colors",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-10 h-10 bg-neutral-100 overflow-hidden flex-shrink-0",
                                children: rider.image_url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: rider.image_url,
                                    alt: rider.full_name,
                                    className: "w-full h-full object-cover"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 338,
                                    columnNumber: 337
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-full h-full bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-400 uppercase",
                                    children: rider.full_name.charAt(0)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 338,
                                    columnNumber: 430
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 338,
                                columnNumber: 246
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 338,
                            columnNumber: 220
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4 font-medium",
                            children: rider.full_name
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 338,
                            columnNumber: 593
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4 font-mono text-xs text-neutral-600",
                            children: rider.phone_number
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 338,
                            columnNumber: 653
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4 font-mono text-xs text-neutral-500",
                            children: rider.bike_reg || "\u2014"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 338,
                            columnNumber: 739
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: {
                                    "RidersTab[riders.map() > <button>.onClick]": ()=>toggleActive(rider.id, rider.is_active)
                                }["RidersTab[riders.map() > <button>.onClick]"],
                                className: `px-2 py-1 text-[10px] uppercase tracking-widest rounded ${rider.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`,
                                children: rider.is_active ? "Active" : "Inactive"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 338,
                                columnNumber: 859
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 338,
                            columnNumber: 833
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3 justify-end",
                                children: confirmDeleteId === rider.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: {
                                                "RidersTab[riders.map() > <button>.onClick]": ()=>handleDelete(rider.id)
                                            }["RidersTab[riders.map() > <button>.onClick]"],
                                            className: "text-xs uppercase tracking-widest text-red-600 hover:text-red-800 font-semibold",
                                            children: "Yes"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 340,
                                            columnNumber: 384
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: {
                                                "RidersTab[riders.map() > <button>.onClick]": ()=>setConfirmDeleteId(null)
                                            }["RidersTab[riders.map() > <button>.onClick]"],
                                            className: "text-xs uppercase tracking-widest text-neutral-400 hover:text-black",
                                            children: "No"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 342,
                                            columnNumber: 168
                                        }, this)
                                    ]
                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: {
                                                "RidersTab[riders.map() > <button>.onClick]": ()=>startEdit(rider)
                                            }["RidersTab[riders.map() > <button>.onClick]"],
                                            className: "text-neutral-400 hover:text-black transition-colors",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__["Pencil"], {
                                                size: 14
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 346,
                                                columnNumber: 128
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 344,
                                            columnNumber: 163
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: {
                                                "RidersTab[riders.map() > <button>.onClick]": ()=>setConfirmDeleteId(rider.id)
                                            }["RidersTab[riders.map() > <button>.onClick]"],
                                            className: "text-neutral-400 hover:text-red-600 transition-colors",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                size: 14
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 348,
                                                columnNumber: 130
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 346,
                                            columnNumber: 157
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 340,
                                columnNumber: 297
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 340,
                            columnNumber: 271
                        }, this)
                    ]
                }, rider.id, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 338,
                    columnNumber: 151
                }, this)
        }["RidersTab[riders.map()]"]);
        $[31] = confirmDeleteId;
        $[32] = editForm;
        $[33] = editingId;
        $[34] = handleSaveEdit;
        $[35] = loading;
        $[36] = riders;
        $[37] = saving;
        $[38] = t16;
    } else {
        t16 = $[38];
    }
    let t17;
    if ($[39] !== t16) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border border-neutral-200 overflow-x-auto",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                className: "w-full text-sm text-left whitespace-nowrap",
                children: [
                    t15,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        className: "divide-y divide-neutral-100",
                        children: t16
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 363,
                        columnNumber: 146
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                lineNumber: 363,
                columnNumber: 79
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 363,
            columnNumber: 11
        }, this);
        $[39] = t16;
        $[40] = t17;
    } else {
        t17 = $[40];
    }
    let t18;
    if ($[41] !== t13 || $[42] !== t14 || $[43] !== t17) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-8 max-w-4xl",
            children: [
                t13,
                t14,
                t17
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
            lineNumber: 371,
            columnNumber: 11
        }, this);
        $[41] = t13;
        $[42] = t14;
        $[43] = t17;
        $[44] = t18;
    } else {
        t18 = $[44];
    }
    return t18;
}
_s(RidersTab, "2Mt6Os2iaaNUCl4UKs7A6Fo/bUM=");
_c = RidersTab;
var _c;
__turbopack_context__.k.register(_c, "RidersTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SizeGuideTab",
    ()=>SizeGuideTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
const DEFAULTS = [
    {
        label: "XS",
        bust: "80–83",
        waist: "62–65",
        hips: "88–91"
    },
    {
        label: "S",
        bust: "84–87",
        waist: "66–69",
        hips: "92–95"
    },
    {
        label: "M",
        bust: "88–91",
        waist: "70–73",
        hips: "96–99"
    },
    {
        label: "L",
        bust: "92–96",
        waist: "74–78",
        hips: "100–104"
    },
    {
        label: "XL",
        bust: "97–102",
        waist: "79–84",
        hips: "105–110"
    },
    {
        label: "XXL",
        bust: "103–110",
        waist: "85–92",
        hips: "111–118"
    }
];
const FIELDS = [
    {
        key: "label",
        label: "Size"
    },
    {
        key: "bust",
        label: "Bust (cm)"
    },
    {
        key: "waist",
        label: "Waist (cm)"
    },
    {
        key: "hips",
        label: "Hips (cm)"
    }
];
function SizeGuideTab() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(27);
    if ($[0] !== "45aef04ac488f5d2915359b96acb7e09edb8c560820360a65578c0942409c4fb") {
        for(let $i = 0; $i < 27; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "45aef04ac488f5d2915359b96acb7e09edb8c560820360a65578c0942409c4fb";
    }
    const [rows, setRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULTS);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    let t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = ({
            "SizeGuideTab[useEffect()]": ()=>{
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_copy").select("value").eq("copy_key", "size_guide_rows").single().then({
                    "SizeGuideTab[useEffect() > (anonymous)()]": (t2)=>{
                        const { data } = t2;
                        if (data?.value) {
                            try {
                                setRows(JSON.parse(data.value));
                            } catch  {}
                        }
                        setLoading(false);
                    }
                }["SizeGuideTab[useEffect() > (anonymous)()]"]);
            }
        })["SizeGuideTab[useEffect()]"];
        t1 = [];
        $[1] = t0;
        $[2] = t1;
    } else {
        t0 = $[1];
        t1 = $[2];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "SizeGuideTab[handleChange]": (index, field, value)=>{
                setRows({
                    "SizeGuideTab[handleChange > setRows()]": (prev)=>prev.map({
                            "SizeGuideTab[handleChange > setRows() > prev.map()]": (row, i)=>i === index ? {
                                    ...row,
                                    [field]: value
                                } : row
                        }["SizeGuideTab[handleChange > setRows() > prev.map()]"])
                }["SizeGuideTab[handleChange > setRows()]"]);
            }
        })["SizeGuideTab[handleChange]"];
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    const handleChange = t2;
    let t3;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = ({
            "SizeGuideTab[handleAddRow]": ()=>{
                setRows(_SizeGuideTabHandleAddRowSetRows);
            }
        })["SizeGuideTab[handleAddRow]"];
        $[4] = t3;
    } else {
        t3 = $[4];
    }
    const handleAddRow = t3;
    let t4;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = ({
            "SizeGuideTab[handleRemoveRow]": (index_0)=>{
                setRows({
                    "SizeGuideTab[handleRemoveRow > setRows()]": (prev_1)=>prev_1.filter({
                            "SizeGuideTab[handleRemoveRow > setRows() > prev_1.filter()]": (_, i_0)=>i_0 !== index_0
                        }["SizeGuideTab[handleRemoveRow > setRows() > prev_1.filter()]"])
                }["SizeGuideTab[handleRemoveRow > setRows()]"]);
            }
        })["SizeGuideTab[handleRemoveRow]"];
        $[5] = t4;
    } else {
        t4 = $[5];
    }
    const handleRemoveRow = t4;
    let t5;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = ({
            "SizeGuideTab[handleReset]": ()=>setRows(DEFAULTS)
        })["SizeGuideTab[handleReset]"];
        $[6] = t5;
    } else {
        t5 = $[6];
    }
    const handleReset = t5;
    let t6;
    if ($[7] !== rows) {
        t6 = ({
            "SizeGuideTab[handleSave]": async ()=>{
                setSaving(true);
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_copy").upsert({
                    copy_key: "size_guide_rows",
                    label: "Size Guide Table",
                    page_group: "size_guide",
                    value: JSON.stringify(rows),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: "copy_key"
                });
                setSaving(false);
                setSaved(true);
                setTimeout({
                    "SizeGuideTab[handleSave > setTimeout()]": ()=>setSaved(false)
                }["SizeGuideTab[handleSave > setTimeout()]"], 2000);
            }
        })["SizeGuideTab[handleSave]"];
        $[7] = rows;
        $[8] = t6;
    } else {
        t6 = $[8];
    }
    const handleSave = t6;
    if (loading) {
        let t7;
        if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
            t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-neutral-400 italic font-serif py-8",
                children: "Loading size guide..."
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                lineNumber: 186,
                columnNumber: 12
            }, this);
            $[9] = t7;
        } else {
            t7 = $[9];
        }
        return t7;
    }
    let t7;
    if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "text-sm font-semibold uppercase tracking-widest mb-2",
                    children: "Size Guide Editor"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                    lineNumber: 195,
                    columnNumber: 15
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-neutral-500 text-sm leading-relaxed",
                    children: "Edit the size guide shown on all product pages. Measurements are in centimetres. Changes are reflected immediately on the storefront."
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                    lineNumber: 195,
                    columnNumber: 106
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
            lineNumber: 195,
            columnNumber: 10
        }, this);
        $[10] = t7;
    } else {
        t7 = $[10];
    }
    let t8;
    if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                className: "bg-neutral-50 border-b border-neutral-200",
                children: [
                    FIELDS.map(_SizeGuideTabFIELDSMap),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "py-3 px-4 w-10"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                        lineNumber: 202,
                        columnNumber: 111
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                lineNumber: 202,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
            lineNumber: 202,
            columnNumber: 10
        }, this);
        $[11] = t8;
    } else {
        t8 = $[11];
    }
    let t9;
    if ($[12] !== rows) {
        let t10;
        if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
            t10 = ({
                "SizeGuideTab[rows.map()]": (row_0, i_1)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                        className: "border-b border-neutral-100 last:border-0",
                        children: [
                            FIELDS.map({
                                "SizeGuideTab[rows.map() > FIELDS.map()]": (f_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        className: "px-4 py-2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: row_0[f_0.key],
                                            onChange: {
                                                "SizeGuideTab[rows.map() > FIELDS.map() > <input>.onChange]": (e)=>handleChange(i_1, f_0.key, e.target.value)
                                            }["SizeGuideTab[rows.map() > FIELDS.map() > <input>.onChange]"],
                                            placeholder: f_0.label,
                                            className: "w-full border-b border-neutral-200 bg-transparent py-1.5 text-sm outline-none focus:border-black transition-colors"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                            lineNumber: 213,
                                            columnNumber: 103
                                        }, this)
                                    }, f_0.key, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                        lineNumber: 213,
                                        columnNumber: 63
                                    }, this)
                            }["SizeGuideTab[rows.map() > FIELDS.map()]"]),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: "px-4 py-2 text-center",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: {
                                        "SizeGuideTab[rows.map() > <button>.onClick]": ()=>handleRemoveRow(i_1)
                                    }["SizeGuideTab[rows.map() > <button>.onClick]"],
                                    className: "text-neutral-300 hover:text-red-500 transition-colors text-sm leading-none",
                                    title: "Remove row",
                                    children: "✕"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                    lineNumber: 216,
                                    columnNumber: 95
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                lineNumber: 216,
                                columnNumber: 57
                            }, this)
                        ]
                    }, i_1, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                        lineNumber: 212,
                        columnNumber: 53
                    }, this)
            })["SizeGuideTab[rows.map()]"];
            $[14] = t10;
        } else {
            t10 = $[14];
        }
        t9 = rows.map(t10);
        $[12] = rows;
        $[13] = t9;
    } else {
        t9 = $[13];
    }
    let t10;
    if ($[15] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "overflow-x-auto border border-neutral-200",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                className: "w-full border-collapse min-w-[500px]",
                children: [
                    t8,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        children: t9
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                        lineNumber: 232,
                        columnNumber: 130
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                lineNumber: 232,
                columnNumber: 70
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
            lineNumber: 232,
            columnNumber: 11
        }, this);
        $[15] = t9;
        $[16] = t10;
    } else {
        t10 = $[16];
    }
    let t11;
    let t12;
    if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: handleAddRow,
            className: "text-[10px] uppercase tracking-widest font-bold border border-neutral-200 px-5 py-2.5 hover:border-black transition-colors",
            children: "+ Add Row"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
            lineNumber: 241,
            columnNumber: 11
        }, this);
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: handleReset,
            className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-black transition-colors underline underline-offset-4",
            children: "Reset to Defaults"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
            lineNumber: 242,
            columnNumber: 11
        }, this);
        $[17] = t11;
        $[18] = t12;
    } else {
        t11 = $[17];
        t12 = $[18];
    }
    const t13 = saving ? "Saving..." : saved ? "Saved \u2713" : "Save Size Guide";
    let t14;
    if ($[19] !== handleSave || $[20] !== saving || $[21] !== t13) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-4 flex-wrap",
            children: [
                t11,
                t12,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: handleSave,
                    disabled: saving,
                    className: "px-8 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 ml-auto",
                    children: t13
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                    lineNumber: 252,
                    columnNumber: 72
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
            lineNumber: 252,
            columnNumber: 11
        }, this);
        $[19] = handleSave;
        $[20] = saving;
        $[21] = t13;
        $[22] = t14;
    } else {
        t14 = $[22];
    }
    let t15;
    if ($[23] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 tracking-wider",
            children: "Tip: You can add custom rows for regional sizes (e.g., EU 36, UK 8) or remove irrelevant sizes."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
            lineNumber: 262,
            columnNumber: 11
        }, this);
        $[23] = t15;
    } else {
        t15 = $[23];
    }
    let t16;
    if ($[24] !== t10 || $[25] !== t14) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-8",
            children: [
                t7,
                t10,
                t14,
                t15
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
            lineNumber: 269,
            columnNumber: 11
        }, this);
        $[24] = t10;
        $[25] = t14;
        $[26] = t16;
    } else {
        t16 = $[26];
    }
    return t16;
}
_s(SizeGuideTab, "AT3hZ9yP1+YkpWYxQ72nQooMwkg=");
_c = SizeGuideTab;
function _SizeGuideTabFIELDSMap(f) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
        className: "text-[10px] uppercase tracking-widest text-left py-3 px-4 font-semibold text-neutral-500",
        children: f.label
    }, f.key, false, {
        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
        lineNumber: 279,
        columnNumber: 10
    }, this);
}
function _SizeGuideTabHandleAddRowSetRows(prev_0) {
    return [
        ...prev_0,
        {
            label: "",
            bust: "",
            waist: "",
            hips: ""
        }
    ];
}
var _c;
__turbopack_context__.k.register(_c, "SizeGuideTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/data:7b9476 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "inviteTeamMember",
    ()=>$$RSC_SERVER_ACTION_0
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"4045a8f3c29aa4fdd90b0e4f4beead23aad28fcf69":"inviteTeamMember"},"src/app/(dashboard)/settings/actions.ts",""] */ "use turbopack no side effects";
;
const $$RSC_SERVER_ACTION_0 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("4045a8f3c29aa4fdd90b0e4f4beead23aad28fcf69", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "inviteTeamMember");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
 //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlU2VydmVyXCI7XG5pbXBvcnQgeyBzdXBhYmFzZUFkbWluIH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlQWRtaW5cIjtcbmltcG9ydCB7IGdldFVybCB9IGZyb20gXCJAL2xpYi91dGlscy9nZXRVcmxcIjtcbmltcG9ydCB7IFJlc2VuZCB9IGZyb20gXCJyZXNlbmRcIjtcbmltcG9ydCB7IHNlbmRTTVMgfSBmcm9tIFwiQC9saWIvc21zXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGxvZ0FjdGl2aXR5IH0gZnJvbSBcIkAvbGliL3V0aWxzL2xvZ0FjdGl2aXR5XCI7XG5cbmNvbnN0IHJlc2VuZCA9IG5ldyBSZXNlbmQocHJvY2Vzcy5lbnYuUkVTRU5EX0FQSV9LRVkhKTtcblxuaW50ZXJmYWNlIEludml0ZURhdGEge1xuICAgIGZ1bGxOYW1lOiBzdHJpbmc7XG4gICAgZW1haWw6IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZztcbiAgICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnZpdGVUZWFtTWVtYmVyKGRhdGE6IEludml0ZURhdGEpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuXG4gICAgaWYgKHVzZXJFcnJvciB8fCAhdXNlckRhdGE/LnVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XG4gICAgfVxuXG4gICAgLy8gR2V0IGNhbGxlcidzIHJvbGVcbiAgICBjb25zdCB7IGRhdGE6IGNhbGxlclByb2ZpbGUgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKFwicHJvZmlsZXNcIilcbiAgICAgICAgLnNlbGVjdChcInJvbGVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlckRhdGEudXNlci5pZClcbiAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgY29uc3QgdG9rZW4gPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICBjb25zdCBkeW5hbWljSG9zdCA9IGF3YWl0IGdldFVybCgpO1xuICAgIGNvbnN0IGludml0ZUxpbmsgPSBgJHtkeW5hbWljSG9zdH0vaW52aXRlP3Rva2VuPSR7dG9rZW59YDtcblxuICAgIGNvbnN0IHsgZXJyb3I6IGluc2VydEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmZyb20oXCJ0ZWFtX2ludml0YXRpb25zXCIpLmluc2VydCh7XG4gICAgICAgIGZ1bGxfbmFtZTogZGF0YS5mdWxsTmFtZSxcbiAgICAgICAgZW1haWw6IGRhdGEuZW1haWwsXG4gICAgICAgIHBob25lOiBkYXRhLnBob25lIHx8IG51bGwsXG4gICAgICAgIHJvbGU6IGRhdGEucm9sZSxcbiAgICAgICAgdG9rZW4sXG4gICAgICAgIGludml0ZWRfYnk6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgfSk7XG5cbiAgICBpZiAoaW5zZXJ0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkludml0ZSBpbnNlcnRpb24gZXJyb3I6XCIsIGluc2VydEVycm9yKTtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZhaWxlZCB0byBjcmVhdGUgaW52aXRhdGlvbiByZWNvcmQuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBMT0cgQUNUSVZJVFlcbiAgICBhd2FpdCBsb2dBY3Rpdml0eSh7XG4gICAgICAgIHVzZXJJZDogdXNlckRhdGEudXNlci5pZCxcbiAgICAgICAgdXNlclJvbGU6IGNhbGxlclByb2ZpbGU/LnJvbGUgfHwgJ2FkbWluJyxcbiAgICAgICAgYWN0aW9uVHlwZTogXCJJTlZJVEVcIixcbiAgICAgICAgcmVzb3VyY2U6IFwidGVhbVwiLFxuICAgICAgICBkZXRhaWxzOiB7IGVtYWlsOiBkYXRhLmVtYWlsLCByb2xlOiBkYXRhLnJvbGUgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IGBZb3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gY29sbGFib3JhdGUgb24gTWlzcyBUb2t5byBhcyBhICR7ZGF0YS5yb2xlfS4gSm9pbiBoZXJlOiAke2ludml0ZUxpbmt9YDtcblxuICAgIC8vIDEuIEZvcm1hdCBQaG9uZSBOdW1iZXIgKEdoYW5hIHN0YW5kYXJkICsyMzMpXG4gICAgbGV0IGZvcm1hdHRlZFBob25lID0gZGF0YS5waG9uZTtcbiAgICBpZiAoZm9ybWF0dGVkUGhvbmUpIHtcbiAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBmb3JtYXR0ZWRQaG9uZS5yZXBsYWNlKC9cXEQvZywgXCJcIik7XG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZS5zdGFydHNXaXRoKFwiMFwiKSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBcIjIzM1wiICsgZm9ybWF0dGVkUGhvbmUuc2xpY2UoMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWZvcm1hdHRlZFBob25lLnN0YXJ0c1dpdGgoXCIyMzNcIikpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIyMzNcIiArIGZvcm1hdHRlZFBob25lO1xuICAgICAgICB9XG4gICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIrXCIgKyBmb3JtYXR0ZWRQaG9uZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBhd2FpdCByZXNlbmQuZW1haWxzLnNlbmQoe1xuICAgICAgICAgICAgZnJvbTogcHJvY2Vzcy5lbnYuUkVTRU5EX0ZST01fRU1BSUwgfHwgXCJvcmRlcnNAaW5mby5taXNzdG9reW8uc2hvcFwiLFxuICAgICAgICAgICAgdG86IGRhdGEuZW1haWwsXG4gICAgICAgICAgICBzdWJqZWN0OiBcIkludml0YXRpb24gdG8gSm9pbiBNaXNzIFRva3lvIFRlYW1cIixcbiAgICAgICAgICAgIHRleHQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICBodG1sOiBgPHA+WW91IGhhdmUgYmVlbiBpbnZpdGVkIHRvIGNvbGxhYm9yYXRlIG9uIE1pc3MgVG9reW8gYXMgYSA8c3Ryb25nPiR7ZGF0YS5yb2xlfTwvc3Ryb25nPi48L3A+PHA+PGEgaHJlZj1cIiR7aW52aXRlTGlua31cIj5DbGljayBoZXJlIHRvIGFjY2VwdCB5b3VyIGludml0YXRpb248L2E+PC9wPmAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBzZW5kU01TKHsgdG86IGZvcm1hdHRlZFBob25lLCBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoc21zRXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlNNUyBmYWlsZWQsIGJ1dCBlbWFpbCBzZW50OlwiLCBzbXNFcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHdhcm5pbmc6ICdFbWFpbCBzZW50LCBidXQgU01TIGZhaWxlZC4nIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIGludml0ZSBlbWFpbHM6XCIsIGVycik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZpdGF0aW9uIHNhdmVkLCBidXQgZmFpbGVkIHRvIGRpc3BhdGNoIGNvbW11bmljYXRpb25zLlwiIH07XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlVGVhbU1lbWJlcih1c2VySWQ6IHN0cmluZykge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBkYXRhOiB1c2VyRGF0YSwgZXJyb3I6IHVzZXJFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XG5cbiAgICBpZiAodXNlckVycm9yIHx8ICF1c2VyRGF0YT8udXNlcikge1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcbiAgICB9XG5cbiAgICAvLyBDUklUSUNBTCBTRUNVUklUWTogVmVyaWZ5IGNhbGxlciBpcyBhbiBhZG1pbiBvciBvd25lclxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgICAgIFxuICAgIGlmICghY2FsbGVyRGF0YSB8fCAoY2FsbGVyRGF0YS5yb2xlICE9PSAnYWRtaW4nICYmIGNhbGxlckRhdGEucm9sZSAhPT0gJ293bmVyJykpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gcmVtb3ZlIG1lbWJlcnMuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBEZW1vdGUgcm9sZSB0byAnY3VzdG9tZXInIHNvIHRoZXkgbG9zZSBkYXNoYm9hcmQgYWNjZXNzIHdpdGhvdXQgZGVzdHJveWluZ1xuICAgIC8vIHRoZWlyIGFjY291bnQgb3IgdHJpZ2dlcmluZyBGSyBjb25zdHJhaW50IGZhaWx1cmVzIG9uIG9yZGVycy9wb3Nfc2Vzc2lvbnMvbG9ncy5cbiAgICBjb25zdCB7IGVycm9yOiBkZW1vdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgICAuZnJvbShcInByb2ZpbGVzXCIpXG4gICAgICAgIC51cGRhdGUoeyByb2xlOiBcImN1c3RvbWVyXCIgfSlcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlcklkKTtcblxuICAgIGlmIChkZW1vdGVFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGRlbW90ZSB1c2VyIElEXCIsIHVzZXJJZCwgZGVtb3RlRXJyb3IpO1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRmFpbGVkIHRvIHJlbW92ZSB0ZWFtIG1lbWJlci5cIiB9O1xuICAgIH1cblxuICAgIC8vIEZvcmNlIHNpZ24tb3V0IHNvIHRoZSByZW1vdmVkIG1lbWJlcidzIHNlc3Npb24gZW5kcyBpbW1lZGlhdGVseS5cbiAgICBhd2FpdCBzdXBhYmFzZUFkbWluLmF1dGguYWRtaW4uc2lnbk91dCh1c2VySWQsIFwiZ2xvYmFsXCIpO1xuXG4gICAgLy8gTE9HIEFDVElWSVRZXG4gICAgYXdhaXQgbG9nQWN0aXZpdHkoe1xuICAgICAgICB1c2VySWQ6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgICAgIHVzZXJSb2xlOiBjYWxsZXJEYXRhLnJvbGUsXG4gICAgICAgIGFjdGlvblR5cGU6IFwiUkVNT1ZFX01FTUJFUlwiLFxuICAgICAgICByZXNvdXJjZTogXCJ0ZWFtXCIsXG4gICAgICAgIHJlc291cmNlSWQ6IHVzZXJJZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZFBhc3N3b3JkUmVzZXRMaW5rKHRhcmdldEVtYWlsOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIGlmICh1c2VyRXJyb3IgfHwgIXVzZXJEYXRhPy51c2VyKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcblxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgaWYgKCFjYWxsZXJEYXRhIHx8IChjYWxsZXJEYXRhLnJvbGUgIT09IFwiYWRtaW5cIiAmJiBjYWxsZXJEYXRhLnJvbGUgIT09IFwib3duZXJcIikpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gc2VuZCByZXNldCBsaW5rcy5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHsgY3JlYXRlQ2xpZW50OiBjcmVhdGVTZXJ2aWNlQ2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIik7XG4gICAgY29uc3QgYWRtaW5DbGllbnQgPSBjcmVhdGVTZXJ2aWNlQ2xpZW50KFxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxuICAgICAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZISxcbiAgICAgICAgeyBhdXRoOiB7IGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLCBwZXJzaXN0U2Vzc2lvbjogZmFsc2UgfSB9XG4gICAgKTtcblxuICAgIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcImh0dHBzOi8vbWlzc3Rva3lvLnNob3BcIjtcblxuICAgIC8vIEZldGNoIGJpeiBuYW1lIHNvIHRoZSBlbWFpbCBoZWFkZXIgbWF0Y2hlcyB0aGUgcmVzdCBvZiB0aGUgc3lzdGVtXG4gICAgY29uc3QgeyBkYXRhOiBiaXogfSA9IGF3YWl0IGFkbWluQ2xpZW50XG4gICAgICAgIC5mcm9tKFwiYnVzaW5lc3Nfc2V0dGluZ3NcIilcbiAgICAgICAgLnNlbGVjdChcImJ1c2luZXNzX25hbWVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgXCJkZWZhdWx0XCIpXG4gICAgICAgIC5zaW5nbGUoKTtcbiAgICBjb25zdCBiaXpOYW1lID0gKGJpeiBhcyBhbnkpPy5idXNpbmVzc19uYW1lIHx8IFwiTWlzcyBUb2t5b1wiO1xuXG4gICAgY29uc3QgeyBkYXRhOiBsaW5rRGF0YSwgZXJyb3I6IGxpbmtFcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuYXV0aC5hZG1pbi5nZW5lcmF0ZUxpbmsoe1xuICAgICAgICB0eXBlOiBcInJlY292ZXJ5XCIsXG4gICAgICAgIGVtYWlsOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgb3B0aW9uczogeyByZWRpcmVjdFRvOiBgJHtzaXRlVXJsfS9hY2NvdW50L3Jlc2V0LXBhc3N3b3JkYCB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGxpbmtFcnJvciB8fCAhbGlua0RhdGEpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGdlbmVyYXRlTGluayBmYWlsZWQ6XCIsIGxpbmtFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGYWlsZWQgdG8gZ2VuZXJhdGUgcmVzZXQgbGluay5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc2V0TGluayA9IChsaW5rRGF0YSBhcyBhbnkpPy5wcm9wZXJ0aWVzPy5hY3Rpb25fbGluaztcbiAgICBpZiAoIXJlc2V0TGluaykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkNvdWxkIG5vdCByZXRyaWV2ZSByZXNldCBsaW5rLlwiIH07XG5cbiAgICBjb25zdCB7IHNlbmRFbWFpbCB9ID0gYXdhaXQgaW1wb3J0KFwiQC9saWIvZW1haWxcIik7XG4gICAgY29uc3QgeyBvaywgZXJyb3I6IGVtYWlsRXJyb3IgfSA9IGF3YWl0IHNlbmRFbWFpbCh7XG4gICAgICAgIHRvOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgc3ViamVjdDogYFJlc2V0IHlvdXIgJHtiaXpOYW1lfSBwYXNzd29yZGAsXG4gICAgICAgIGh0bWw6IGBcbjwhRE9DVFlQRSBodG1sPlxuPGh0bWw+XG48Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBHZW9yZ2lhLCBzZXJpZjsgYmFja2dyb3VuZDogI2ZhZmFmOTsgbWFyZ2luOiAwOyBwYWRkaW5nOiA0MHB4IDIwcHg7XCI+XG4gIDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDU2MHB4OyBtYXJnaW46IDAgYXV0bzsgYmFja2dyb3VuZDogd2hpdGU7IGJvcmRlcjogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmc6IDQ4cHg7XCI+XG4gICAgPGgxIHN0eWxlPVwiZm9udC1zaXplOiAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBtYXJnaW46IDAgMCA4cHg7XCI+JHtiaXpOYW1lfTwvaDE+XG4gICAgPHAgc3R5bGU9XCJjb2xvcjogIzczNzM3MzsgZm9udC1zaXplOiAxMXB4OyBsZXR0ZXItc3BhY2luZzogMC4yZW07IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IG1hcmdpbjogMCAwIDQwcHg7XCI+UGFzc3dvcmQgUmVzZXQ8L3A+XG5cbiAgICA8aDIgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7IGZvbnQtd2VpZ2h0OiBub3JtYWw7IGNvbG9yOiAjMTcxNzE3OyBtYXJnaW46IDAgMCAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4wNWVtO1wiPlxuICAgICAgUmVzZXQgeW91ciBwYXNzd29yZFxuICAgIDwvaDI+XG5cbiAgICA8cCBzdHlsZT1cImZvbnQtc2l6ZTogMTRweDsgY29sb3I6ICM1MjUyNTI7IGxpbmUtaGVpZ2h0OiAxLjg7IG1hcmdpbjogMCAwIDMycHg7XCI+XG4gICAgICBBbiBhZG1pbiBoYXMgcmVxdWVzdGVkIGEgcGFzc3dvcmQgcmVzZXQgZm9yIHlvdXIgYWNjb3VudC4gQ2xpY2sgdGhlIGJ1dHRvbiBiZWxvdyB0byBzZXQgYSBuZXcgcGFzc3dvcmQuIFRoaXMgbGluayBleHBpcmVzIGluIDEgaG91ci5cbiAgICA8L3A+XG5cbiAgICA8YSBocmVmPVwiJHtyZXNldExpbmt9XCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazsgYmFja2dyb3VuZDogIzE3MTcxNzsgY29sb3I6IHdoaXRlOyB0ZXh0LWRlY29yYXRpb246IG5vbmU7IGZvbnQtc2l6ZTogMTBweDsgbGV0dGVyLXNwYWNpbmc6IDAuMmVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBwYWRkaW5nOiAxNnB4IDMycHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC13ZWlnaHQ6IDcwMDsgbWFyZ2luLWJvdHRvbTogMzJweDtcIj5cbiAgICAgIFJlc2V0IE15IFBhc3N3b3JkIOKGklxuICAgIDwvYT5cblxuICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxM3B4OyBjb2xvcjogIzczNzM3MzsgbGluZS1oZWlnaHQ6IDEuODsgbWFyZ2luOiAwIDAgMzJweDtcIj5cbiAgICAgIElmIHlvdSBkaWQgbm90IGV4cGVjdCB0aGlzIGVtYWlsLCB5b3UgY2FuIHNhZmVseSBpZ25vcmUgaXQg4oCUIHlvdXIgYWNjb3VudCByZW1haW5zIHNlY3VyZS5cbiAgICA8L3A+XG5cbiAgICA8ZGl2IHN0eWxlPVwiYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmctdG9wOiAyNHB4OyBtYXJnaW4tdG9wOiAyNHB4O1wiPlxuICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiAjYTNhM2EzOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyBtYXJnaW46IDA7XCI+XG4gICAgICAgICR7Yml6TmFtZX1cbiAgICAgIDwvcD5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YCxcbiAgICB9KTtcblxuICAgIGlmICghb2spIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGVtYWlsIGZhaWxlZDpcIiwgZW1haWxFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJSZXNldCBsaW5rIGdlbmVyYXRlZCBidXQgZW1haWwgZmFpbGVkIHRvIHNlbmQuXCIgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjRTQW1Cc0IsNkxBQUEifQ==
}),
"[project]/src/app/(dashboard)/settings/data:77941c [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "removeTeamMember",
    ()=>$$RSC_SERVER_ACTION_1
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"40dd4b387ad58896edeb12776262a085056554847f":"removeTeamMember"},"src/app/(dashboard)/settings/actions.ts",""] */ "use turbopack no side effects";
;
const $$RSC_SERVER_ACTION_1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("40dd4b387ad58896edeb12776262a085056554847f", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "removeTeamMember");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
 //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlU2VydmVyXCI7XG5pbXBvcnQgeyBzdXBhYmFzZUFkbWluIH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlQWRtaW5cIjtcbmltcG9ydCB7IGdldFVybCB9IGZyb20gXCJAL2xpYi91dGlscy9nZXRVcmxcIjtcbmltcG9ydCB7IFJlc2VuZCB9IGZyb20gXCJyZXNlbmRcIjtcbmltcG9ydCB7IHNlbmRTTVMgfSBmcm9tIFwiQC9saWIvc21zXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGxvZ0FjdGl2aXR5IH0gZnJvbSBcIkAvbGliL3V0aWxzL2xvZ0FjdGl2aXR5XCI7XG5cbmNvbnN0IHJlc2VuZCA9IG5ldyBSZXNlbmQocHJvY2Vzcy5lbnYuUkVTRU5EX0FQSV9LRVkhKTtcblxuaW50ZXJmYWNlIEludml0ZURhdGEge1xuICAgIGZ1bGxOYW1lOiBzdHJpbmc7XG4gICAgZW1haWw6IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZztcbiAgICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnZpdGVUZWFtTWVtYmVyKGRhdGE6IEludml0ZURhdGEpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuXG4gICAgaWYgKHVzZXJFcnJvciB8fCAhdXNlckRhdGE/LnVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XG4gICAgfVxuXG4gICAgLy8gR2V0IGNhbGxlcidzIHJvbGVcbiAgICBjb25zdCB7IGRhdGE6IGNhbGxlclByb2ZpbGUgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKFwicHJvZmlsZXNcIilcbiAgICAgICAgLnNlbGVjdChcInJvbGVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlckRhdGEudXNlci5pZClcbiAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgY29uc3QgdG9rZW4gPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICBjb25zdCBkeW5hbWljSG9zdCA9IGF3YWl0IGdldFVybCgpO1xuICAgIGNvbnN0IGludml0ZUxpbmsgPSBgJHtkeW5hbWljSG9zdH0vaW52aXRlP3Rva2VuPSR7dG9rZW59YDtcblxuICAgIGNvbnN0IHsgZXJyb3I6IGluc2VydEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmZyb20oXCJ0ZWFtX2ludml0YXRpb25zXCIpLmluc2VydCh7XG4gICAgICAgIGZ1bGxfbmFtZTogZGF0YS5mdWxsTmFtZSxcbiAgICAgICAgZW1haWw6IGRhdGEuZW1haWwsXG4gICAgICAgIHBob25lOiBkYXRhLnBob25lIHx8IG51bGwsXG4gICAgICAgIHJvbGU6IGRhdGEucm9sZSxcbiAgICAgICAgdG9rZW4sXG4gICAgICAgIGludml0ZWRfYnk6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgfSk7XG5cbiAgICBpZiAoaW5zZXJ0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkludml0ZSBpbnNlcnRpb24gZXJyb3I6XCIsIGluc2VydEVycm9yKTtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZhaWxlZCB0byBjcmVhdGUgaW52aXRhdGlvbiByZWNvcmQuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBMT0cgQUNUSVZJVFlcbiAgICBhd2FpdCBsb2dBY3Rpdml0eSh7XG4gICAgICAgIHVzZXJJZDogdXNlckRhdGEudXNlci5pZCxcbiAgICAgICAgdXNlclJvbGU6IGNhbGxlclByb2ZpbGU/LnJvbGUgfHwgJ2FkbWluJyxcbiAgICAgICAgYWN0aW9uVHlwZTogXCJJTlZJVEVcIixcbiAgICAgICAgcmVzb3VyY2U6IFwidGVhbVwiLFxuICAgICAgICBkZXRhaWxzOiB7IGVtYWlsOiBkYXRhLmVtYWlsLCByb2xlOiBkYXRhLnJvbGUgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IGBZb3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gY29sbGFib3JhdGUgb24gTWlzcyBUb2t5byBhcyBhICR7ZGF0YS5yb2xlfS4gSm9pbiBoZXJlOiAke2ludml0ZUxpbmt9YDtcblxuICAgIC8vIDEuIEZvcm1hdCBQaG9uZSBOdW1iZXIgKEdoYW5hIHN0YW5kYXJkICsyMzMpXG4gICAgbGV0IGZvcm1hdHRlZFBob25lID0gZGF0YS5waG9uZTtcbiAgICBpZiAoZm9ybWF0dGVkUGhvbmUpIHtcbiAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBmb3JtYXR0ZWRQaG9uZS5yZXBsYWNlKC9cXEQvZywgXCJcIik7XG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZS5zdGFydHNXaXRoKFwiMFwiKSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBcIjIzM1wiICsgZm9ybWF0dGVkUGhvbmUuc2xpY2UoMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWZvcm1hdHRlZFBob25lLnN0YXJ0c1dpdGgoXCIyMzNcIikpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIyMzNcIiArIGZvcm1hdHRlZFBob25lO1xuICAgICAgICB9XG4gICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIrXCIgKyBmb3JtYXR0ZWRQaG9uZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBhd2FpdCByZXNlbmQuZW1haWxzLnNlbmQoe1xuICAgICAgICAgICAgZnJvbTogcHJvY2Vzcy5lbnYuUkVTRU5EX0ZST01fRU1BSUwgfHwgXCJvcmRlcnNAaW5mby5taXNzdG9reW8uc2hvcFwiLFxuICAgICAgICAgICAgdG86IGRhdGEuZW1haWwsXG4gICAgICAgICAgICBzdWJqZWN0OiBcIkludml0YXRpb24gdG8gSm9pbiBNaXNzIFRva3lvIFRlYW1cIixcbiAgICAgICAgICAgIHRleHQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICBodG1sOiBgPHA+WW91IGhhdmUgYmVlbiBpbnZpdGVkIHRvIGNvbGxhYm9yYXRlIG9uIE1pc3MgVG9reW8gYXMgYSA8c3Ryb25nPiR7ZGF0YS5yb2xlfTwvc3Ryb25nPi48L3A+PHA+PGEgaHJlZj1cIiR7aW52aXRlTGlua31cIj5DbGljayBoZXJlIHRvIGFjY2VwdCB5b3VyIGludml0YXRpb248L2E+PC9wPmAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBzZW5kU01TKHsgdG86IGZvcm1hdHRlZFBob25lLCBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoc21zRXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlNNUyBmYWlsZWQsIGJ1dCBlbWFpbCBzZW50OlwiLCBzbXNFcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHdhcm5pbmc6ICdFbWFpbCBzZW50LCBidXQgU01TIGZhaWxlZC4nIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIGludml0ZSBlbWFpbHM6XCIsIGVycik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZpdGF0aW9uIHNhdmVkLCBidXQgZmFpbGVkIHRvIGRpc3BhdGNoIGNvbW11bmljYXRpb25zLlwiIH07XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlVGVhbU1lbWJlcih1c2VySWQ6IHN0cmluZykge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBkYXRhOiB1c2VyRGF0YSwgZXJyb3I6IHVzZXJFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XG5cbiAgICBpZiAodXNlckVycm9yIHx8ICF1c2VyRGF0YT8udXNlcikge1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcbiAgICB9XG5cbiAgICAvLyBDUklUSUNBTCBTRUNVUklUWTogVmVyaWZ5IGNhbGxlciBpcyBhbiBhZG1pbiBvciBvd25lclxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgICAgIFxuICAgIGlmICghY2FsbGVyRGF0YSB8fCAoY2FsbGVyRGF0YS5yb2xlICE9PSAnYWRtaW4nICYmIGNhbGxlckRhdGEucm9sZSAhPT0gJ293bmVyJykpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gcmVtb3ZlIG1lbWJlcnMuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBEZW1vdGUgcm9sZSB0byAnY3VzdG9tZXInIHNvIHRoZXkgbG9zZSBkYXNoYm9hcmQgYWNjZXNzIHdpdGhvdXQgZGVzdHJveWluZ1xuICAgIC8vIHRoZWlyIGFjY291bnQgb3IgdHJpZ2dlcmluZyBGSyBjb25zdHJhaW50IGZhaWx1cmVzIG9uIG9yZGVycy9wb3Nfc2Vzc2lvbnMvbG9ncy5cbiAgICBjb25zdCB7IGVycm9yOiBkZW1vdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgICAuZnJvbShcInByb2ZpbGVzXCIpXG4gICAgICAgIC51cGRhdGUoeyByb2xlOiBcImN1c3RvbWVyXCIgfSlcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlcklkKTtcblxuICAgIGlmIChkZW1vdGVFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGRlbW90ZSB1c2VyIElEXCIsIHVzZXJJZCwgZGVtb3RlRXJyb3IpO1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRmFpbGVkIHRvIHJlbW92ZSB0ZWFtIG1lbWJlci5cIiB9O1xuICAgIH1cblxuICAgIC8vIEZvcmNlIHNpZ24tb3V0IHNvIHRoZSByZW1vdmVkIG1lbWJlcidzIHNlc3Npb24gZW5kcyBpbW1lZGlhdGVseS5cbiAgICBhd2FpdCBzdXBhYmFzZUFkbWluLmF1dGguYWRtaW4uc2lnbk91dCh1c2VySWQsIFwiZ2xvYmFsXCIpO1xuXG4gICAgLy8gTE9HIEFDVElWSVRZXG4gICAgYXdhaXQgbG9nQWN0aXZpdHkoe1xuICAgICAgICB1c2VySWQ6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgICAgIHVzZXJSb2xlOiBjYWxsZXJEYXRhLnJvbGUsXG4gICAgICAgIGFjdGlvblR5cGU6IFwiUkVNT1ZFX01FTUJFUlwiLFxuICAgICAgICByZXNvdXJjZTogXCJ0ZWFtXCIsXG4gICAgICAgIHJlc291cmNlSWQ6IHVzZXJJZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZFBhc3N3b3JkUmVzZXRMaW5rKHRhcmdldEVtYWlsOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIGlmICh1c2VyRXJyb3IgfHwgIXVzZXJEYXRhPy51c2VyKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcblxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgaWYgKCFjYWxsZXJEYXRhIHx8IChjYWxsZXJEYXRhLnJvbGUgIT09IFwiYWRtaW5cIiAmJiBjYWxsZXJEYXRhLnJvbGUgIT09IFwib3duZXJcIikpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gc2VuZCByZXNldCBsaW5rcy5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHsgY3JlYXRlQ2xpZW50OiBjcmVhdGVTZXJ2aWNlQ2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIik7XG4gICAgY29uc3QgYWRtaW5DbGllbnQgPSBjcmVhdGVTZXJ2aWNlQ2xpZW50KFxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxuICAgICAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZISxcbiAgICAgICAgeyBhdXRoOiB7IGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLCBwZXJzaXN0U2Vzc2lvbjogZmFsc2UgfSB9XG4gICAgKTtcblxuICAgIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcImh0dHBzOi8vbWlzc3Rva3lvLnNob3BcIjtcblxuICAgIC8vIEZldGNoIGJpeiBuYW1lIHNvIHRoZSBlbWFpbCBoZWFkZXIgbWF0Y2hlcyB0aGUgcmVzdCBvZiB0aGUgc3lzdGVtXG4gICAgY29uc3QgeyBkYXRhOiBiaXogfSA9IGF3YWl0IGFkbWluQ2xpZW50XG4gICAgICAgIC5mcm9tKFwiYnVzaW5lc3Nfc2V0dGluZ3NcIilcbiAgICAgICAgLnNlbGVjdChcImJ1c2luZXNzX25hbWVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgXCJkZWZhdWx0XCIpXG4gICAgICAgIC5zaW5nbGUoKTtcbiAgICBjb25zdCBiaXpOYW1lID0gKGJpeiBhcyBhbnkpPy5idXNpbmVzc19uYW1lIHx8IFwiTWlzcyBUb2t5b1wiO1xuXG4gICAgY29uc3QgeyBkYXRhOiBsaW5rRGF0YSwgZXJyb3I6IGxpbmtFcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuYXV0aC5hZG1pbi5nZW5lcmF0ZUxpbmsoe1xuICAgICAgICB0eXBlOiBcInJlY292ZXJ5XCIsXG4gICAgICAgIGVtYWlsOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgb3B0aW9uczogeyByZWRpcmVjdFRvOiBgJHtzaXRlVXJsfS9hY2NvdW50L3Jlc2V0LXBhc3N3b3JkYCB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGxpbmtFcnJvciB8fCAhbGlua0RhdGEpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGdlbmVyYXRlTGluayBmYWlsZWQ6XCIsIGxpbmtFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGYWlsZWQgdG8gZ2VuZXJhdGUgcmVzZXQgbGluay5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc2V0TGluayA9IChsaW5rRGF0YSBhcyBhbnkpPy5wcm9wZXJ0aWVzPy5hY3Rpb25fbGluaztcbiAgICBpZiAoIXJlc2V0TGluaykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkNvdWxkIG5vdCByZXRyaWV2ZSByZXNldCBsaW5rLlwiIH07XG5cbiAgICBjb25zdCB7IHNlbmRFbWFpbCB9ID0gYXdhaXQgaW1wb3J0KFwiQC9saWIvZW1haWxcIik7XG4gICAgY29uc3QgeyBvaywgZXJyb3I6IGVtYWlsRXJyb3IgfSA9IGF3YWl0IHNlbmRFbWFpbCh7XG4gICAgICAgIHRvOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgc3ViamVjdDogYFJlc2V0IHlvdXIgJHtiaXpOYW1lfSBwYXNzd29yZGAsXG4gICAgICAgIGh0bWw6IGBcbjwhRE9DVFlQRSBodG1sPlxuPGh0bWw+XG48Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBHZW9yZ2lhLCBzZXJpZjsgYmFja2dyb3VuZDogI2ZhZmFmOTsgbWFyZ2luOiAwOyBwYWRkaW5nOiA0MHB4IDIwcHg7XCI+XG4gIDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDU2MHB4OyBtYXJnaW46IDAgYXV0bzsgYmFja2dyb3VuZDogd2hpdGU7IGJvcmRlcjogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmc6IDQ4cHg7XCI+XG4gICAgPGgxIHN0eWxlPVwiZm9udC1zaXplOiAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBtYXJnaW46IDAgMCA4cHg7XCI+JHtiaXpOYW1lfTwvaDE+XG4gICAgPHAgc3R5bGU9XCJjb2xvcjogIzczNzM3MzsgZm9udC1zaXplOiAxMXB4OyBsZXR0ZXItc3BhY2luZzogMC4yZW07IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IG1hcmdpbjogMCAwIDQwcHg7XCI+UGFzc3dvcmQgUmVzZXQ8L3A+XG5cbiAgICA8aDIgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7IGZvbnQtd2VpZ2h0OiBub3JtYWw7IGNvbG9yOiAjMTcxNzE3OyBtYXJnaW46IDAgMCAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4wNWVtO1wiPlxuICAgICAgUmVzZXQgeW91ciBwYXNzd29yZFxuICAgIDwvaDI+XG5cbiAgICA8cCBzdHlsZT1cImZvbnQtc2l6ZTogMTRweDsgY29sb3I6ICM1MjUyNTI7IGxpbmUtaGVpZ2h0OiAxLjg7IG1hcmdpbjogMCAwIDMycHg7XCI+XG4gICAgICBBbiBhZG1pbiBoYXMgcmVxdWVzdGVkIGEgcGFzc3dvcmQgcmVzZXQgZm9yIHlvdXIgYWNjb3VudC4gQ2xpY2sgdGhlIGJ1dHRvbiBiZWxvdyB0byBzZXQgYSBuZXcgcGFzc3dvcmQuIFRoaXMgbGluayBleHBpcmVzIGluIDEgaG91ci5cbiAgICA8L3A+XG5cbiAgICA8YSBocmVmPVwiJHtyZXNldExpbmt9XCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazsgYmFja2dyb3VuZDogIzE3MTcxNzsgY29sb3I6IHdoaXRlOyB0ZXh0LWRlY29yYXRpb246IG5vbmU7IGZvbnQtc2l6ZTogMTBweDsgbGV0dGVyLXNwYWNpbmc6IDAuMmVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBwYWRkaW5nOiAxNnB4IDMycHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC13ZWlnaHQ6IDcwMDsgbWFyZ2luLWJvdHRvbTogMzJweDtcIj5cbiAgICAgIFJlc2V0IE15IFBhc3N3b3JkIOKGklxuICAgIDwvYT5cblxuICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxM3B4OyBjb2xvcjogIzczNzM3MzsgbGluZS1oZWlnaHQ6IDEuODsgbWFyZ2luOiAwIDAgMzJweDtcIj5cbiAgICAgIElmIHlvdSBkaWQgbm90IGV4cGVjdCB0aGlzIGVtYWlsLCB5b3UgY2FuIHNhZmVseSBpZ25vcmUgaXQg4oCUIHlvdXIgYWNjb3VudCByZW1haW5zIHNlY3VyZS5cbiAgICA8L3A+XG5cbiAgICA8ZGl2IHN0eWxlPVwiYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmctdG9wOiAyNHB4OyBtYXJnaW4tdG9wOiAyNHB4O1wiPlxuICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiAjYTNhM2EzOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyBtYXJnaW46IDA7XCI+XG4gICAgICAgICR7Yml6TmFtZX1cbiAgICAgIDwvcD5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YCxcbiAgICB9KTtcblxuICAgIGlmICghb2spIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGVtYWlsIGZhaWxlZDpcIiwgZW1haWxFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJSZXNldCBsaW5rIGdlbmVyYXRlZCBidXQgZW1haWwgZmFpbGVkIHRvIHNlbmQuXCIgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjRTQW9Hc0IsNkxBQUEifQ==
}),
"[project]/src/app/(dashboard)/settings/data:0b49c5 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "sendPasswordResetLink",
    ()=>$$RSC_SERVER_ACTION_2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"400a18c9a7d32c2174cc981a7b14c4d51b65064595":"sendPasswordResetLink"},"src/app/(dashboard)/settings/actions.ts",""] */ "use turbopack no side effects";
;
const $$RSC_SERVER_ACTION_2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("400a18c9a7d32c2174cc981a7b14c4d51b65064595", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "sendPasswordResetLink");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
 //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlU2VydmVyXCI7XG5pbXBvcnQgeyBzdXBhYmFzZUFkbWluIH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlQWRtaW5cIjtcbmltcG9ydCB7IGdldFVybCB9IGZyb20gXCJAL2xpYi91dGlscy9nZXRVcmxcIjtcbmltcG9ydCB7IFJlc2VuZCB9IGZyb20gXCJyZXNlbmRcIjtcbmltcG9ydCB7IHNlbmRTTVMgfSBmcm9tIFwiQC9saWIvc21zXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGxvZ0FjdGl2aXR5IH0gZnJvbSBcIkAvbGliL3V0aWxzL2xvZ0FjdGl2aXR5XCI7XG5cbmNvbnN0IHJlc2VuZCA9IG5ldyBSZXNlbmQocHJvY2Vzcy5lbnYuUkVTRU5EX0FQSV9LRVkhKTtcblxuaW50ZXJmYWNlIEludml0ZURhdGEge1xuICAgIGZ1bGxOYW1lOiBzdHJpbmc7XG4gICAgZW1haWw6IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZztcbiAgICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnZpdGVUZWFtTWVtYmVyKGRhdGE6IEludml0ZURhdGEpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuXG4gICAgaWYgKHVzZXJFcnJvciB8fCAhdXNlckRhdGE/LnVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XG4gICAgfVxuXG4gICAgLy8gR2V0IGNhbGxlcidzIHJvbGVcbiAgICBjb25zdCB7IGRhdGE6IGNhbGxlclByb2ZpbGUgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKFwicHJvZmlsZXNcIilcbiAgICAgICAgLnNlbGVjdChcInJvbGVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlckRhdGEudXNlci5pZClcbiAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgY29uc3QgdG9rZW4gPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICBjb25zdCBkeW5hbWljSG9zdCA9IGF3YWl0IGdldFVybCgpO1xuICAgIGNvbnN0IGludml0ZUxpbmsgPSBgJHtkeW5hbWljSG9zdH0vaW52aXRlP3Rva2VuPSR7dG9rZW59YDtcblxuICAgIGNvbnN0IHsgZXJyb3I6IGluc2VydEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmZyb20oXCJ0ZWFtX2ludml0YXRpb25zXCIpLmluc2VydCh7XG4gICAgICAgIGZ1bGxfbmFtZTogZGF0YS5mdWxsTmFtZSxcbiAgICAgICAgZW1haWw6IGRhdGEuZW1haWwsXG4gICAgICAgIHBob25lOiBkYXRhLnBob25lIHx8IG51bGwsXG4gICAgICAgIHJvbGU6IGRhdGEucm9sZSxcbiAgICAgICAgdG9rZW4sXG4gICAgICAgIGludml0ZWRfYnk6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgfSk7XG5cbiAgICBpZiAoaW5zZXJ0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkludml0ZSBpbnNlcnRpb24gZXJyb3I6XCIsIGluc2VydEVycm9yKTtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZhaWxlZCB0byBjcmVhdGUgaW52aXRhdGlvbiByZWNvcmQuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBMT0cgQUNUSVZJVFlcbiAgICBhd2FpdCBsb2dBY3Rpdml0eSh7XG4gICAgICAgIHVzZXJJZDogdXNlckRhdGEudXNlci5pZCxcbiAgICAgICAgdXNlclJvbGU6IGNhbGxlclByb2ZpbGU/LnJvbGUgfHwgJ2FkbWluJyxcbiAgICAgICAgYWN0aW9uVHlwZTogXCJJTlZJVEVcIixcbiAgICAgICAgcmVzb3VyY2U6IFwidGVhbVwiLFxuICAgICAgICBkZXRhaWxzOiB7IGVtYWlsOiBkYXRhLmVtYWlsLCByb2xlOiBkYXRhLnJvbGUgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IGBZb3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gY29sbGFib3JhdGUgb24gTWlzcyBUb2t5byBhcyBhICR7ZGF0YS5yb2xlfS4gSm9pbiBoZXJlOiAke2ludml0ZUxpbmt9YDtcblxuICAgIC8vIDEuIEZvcm1hdCBQaG9uZSBOdW1iZXIgKEdoYW5hIHN0YW5kYXJkICsyMzMpXG4gICAgbGV0IGZvcm1hdHRlZFBob25lID0gZGF0YS5waG9uZTtcbiAgICBpZiAoZm9ybWF0dGVkUGhvbmUpIHtcbiAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBmb3JtYXR0ZWRQaG9uZS5yZXBsYWNlKC9cXEQvZywgXCJcIik7XG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZS5zdGFydHNXaXRoKFwiMFwiKSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBcIjIzM1wiICsgZm9ybWF0dGVkUGhvbmUuc2xpY2UoMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWZvcm1hdHRlZFBob25lLnN0YXJ0c1dpdGgoXCIyMzNcIikpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIyMzNcIiArIGZvcm1hdHRlZFBob25lO1xuICAgICAgICB9XG4gICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIrXCIgKyBmb3JtYXR0ZWRQaG9uZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBhd2FpdCByZXNlbmQuZW1haWxzLnNlbmQoe1xuICAgICAgICAgICAgZnJvbTogcHJvY2Vzcy5lbnYuUkVTRU5EX0ZST01fRU1BSUwgfHwgXCJvcmRlcnNAaW5mby5taXNzdG9reW8uc2hvcFwiLFxuICAgICAgICAgICAgdG86IGRhdGEuZW1haWwsXG4gICAgICAgICAgICBzdWJqZWN0OiBcIkludml0YXRpb24gdG8gSm9pbiBNaXNzIFRva3lvIFRlYW1cIixcbiAgICAgICAgICAgIHRleHQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICBodG1sOiBgPHA+WW91IGhhdmUgYmVlbiBpbnZpdGVkIHRvIGNvbGxhYm9yYXRlIG9uIE1pc3MgVG9reW8gYXMgYSA8c3Ryb25nPiR7ZGF0YS5yb2xlfTwvc3Ryb25nPi48L3A+PHA+PGEgaHJlZj1cIiR7aW52aXRlTGlua31cIj5DbGljayBoZXJlIHRvIGFjY2VwdCB5b3VyIGludml0YXRpb248L2E+PC9wPmAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBzZW5kU01TKHsgdG86IGZvcm1hdHRlZFBob25lLCBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoc21zRXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlNNUyBmYWlsZWQsIGJ1dCBlbWFpbCBzZW50OlwiLCBzbXNFcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHdhcm5pbmc6ICdFbWFpbCBzZW50LCBidXQgU01TIGZhaWxlZC4nIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIGludml0ZSBlbWFpbHM6XCIsIGVycik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZpdGF0aW9uIHNhdmVkLCBidXQgZmFpbGVkIHRvIGRpc3BhdGNoIGNvbW11bmljYXRpb25zLlwiIH07XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlVGVhbU1lbWJlcih1c2VySWQ6IHN0cmluZykge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBkYXRhOiB1c2VyRGF0YSwgZXJyb3I6IHVzZXJFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XG5cbiAgICBpZiAodXNlckVycm9yIHx8ICF1c2VyRGF0YT8udXNlcikge1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcbiAgICB9XG5cbiAgICAvLyBDUklUSUNBTCBTRUNVUklUWTogVmVyaWZ5IGNhbGxlciBpcyBhbiBhZG1pbiBvciBvd25lclxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgICAgIFxuICAgIGlmICghY2FsbGVyRGF0YSB8fCAoY2FsbGVyRGF0YS5yb2xlICE9PSAnYWRtaW4nICYmIGNhbGxlckRhdGEucm9sZSAhPT0gJ293bmVyJykpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gcmVtb3ZlIG1lbWJlcnMuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBEZW1vdGUgcm9sZSB0byAnY3VzdG9tZXInIHNvIHRoZXkgbG9zZSBkYXNoYm9hcmQgYWNjZXNzIHdpdGhvdXQgZGVzdHJveWluZ1xuICAgIC8vIHRoZWlyIGFjY291bnQgb3IgdHJpZ2dlcmluZyBGSyBjb25zdHJhaW50IGZhaWx1cmVzIG9uIG9yZGVycy9wb3Nfc2Vzc2lvbnMvbG9ncy5cbiAgICBjb25zdCB7IGVycm9yOiBkZW1vdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgICAuZnJvbShcInByb2ZpbGVzXCIpXG4gICAgICAgIC51cGRhdGUoeyByb2xlOiBcImN1c3RvbWVyXCIgfSlcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlcklkKTtcblxuICAgIGlmIChkZW1vdGVFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGRlbW90ZSB1c2VyIElEXCIsIHVzZXJJZCwgZGVtb3RlRXJyb3IpO1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRmFpbGVkIHRvIHJlbW92ZSB0ZWFtIG1lbWJlci5cIiB9O1xuICAgIH1cblxuICAgIC8vIEZvcmNlIHNpZ24tb3V0IHNvIHRoZSByZW1vdmVkIG1lbWJlcidzIHNlc3Npb24gZW5kcyBpbW1lZGlhdGVseS5cbiAgICBhd2FpdCBzdXBhYmFzZUFkbWluLmF1dGguYWRtaW4uc2lnbk91dCh1c2VySWQsIFwiZ2xvYmFsXCIpO1xuXG4gICAgLy8gTE9HIEFDVElWSVRZXG4gICAgYXdhaXQgbG9nQWN0aXZpdHkoe1xuICAgICAgICB1c2VySWQ6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgICAgIHVzZXJSb2xlOiBjYWxsZXJEYXRhLnJvbGUsXG4gICAgICAgIGFjdGlvblR5cGU6IFwiUkVNT1ZFX01FTUJFUlwiLFxuICAgICAgICByZXNvdXJjZTogXCJ0ZWFtXCIsXG4gICAgICAgIHJlc291cmNlSWQ6IHVzZXJJZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZFBhc3N3b3JkUmVzZXRMaW5rKHRhcmdldEVtYWlsOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIGlmICh1c2VyRXJyb3IgfHwgIXVzZXJEYXRhPy51c2VyKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcblxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgaWYgKCFjYWxsZXJEYXRhIHx8IChjYWxsZXJEYXRhLnJvbGUgIT09IFwiYWRtaW5cIiAmJiBjYWxsZXJEYXRhLnJvbGUgIT09IFwib3duZXJcIikpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gc2VuZCByZXNldCBsaW5rcy5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHsgY3JlYXRlQ2xpZW50OiBjcmVhdGVTZXJ2aWNlQ2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIik7XG4gICAgY29uc3QgYWRtaW5DbGllbnQgPSBjcmVhdGVTZXJ2aWNlQ2xpZW50KFxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxuICAgICAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZISxcbiAgICAgICAgeyBhdXRoOiB7IGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLCBwZXJzaXN0U2Vzc2lvbjogZmFsc2UgfSB9XG4gICAgKTtcblxuICAgIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcImh0dHBzOi8vbWlzc3Rva3lvLnNob3BcIjtcblxuICAgIC8vIEZldGNoIGJpeiBuYW1lIHNvIHRoZSBlbWFpbCBoZWFkZXIgbWF0Y2hlcyB0aGUgcmVzdCBvZiB0aGUgc3lzdGVtXG4gICAgY29uc3QgeyBkYXRhOiBiaXogfSA9IGF3YWl0IGFkbWluQ2xpZW50XG4gICAgICAgIC5mcm9tKFwiYnVzaW5lc3Nfc2V0dGluZ3NcIilcbiAgICAgICAgLnNlbGVjdChcImJ1c2luZXNzX25hbWVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgXCJkZWZhdWx0XCIpXG4gICAgICAgIC5zaW5nbGUoKTtcbiAgICBjb25zdCBiaXpOYW1lID0gKGJpeiBhcyBhbnkpPy5idXNpbmVzc19uYW1lIHx8IFwiTWlzcyBUb2t5b1wiO1xuXG4gICAgY29uc3QgeyBkYXRhOiBsaW5rRGF0YSwgZXJyb3I6IGxpbmtFcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuYXV0aC5hZG1pbi5nZW5lcmF0ZUxpbmsoe1xuICAgICAgICB0eXBlOiBcInJlY292ZXJ5XCIsXG4gICAgICAgIGVtYWlsOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgb3B0aW9uczogeyByZWRpcmVjdFRvOiBgJHtzaXRlVXJsfS9hY2NvdW50L3Jlc2V0LXBhc3N3b3JkYCB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGxpbmtFcnJvciB8fCAhbGlua0RhdGEpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGdlbmVyYXRlTGluayBmYWlsZWQ6XCIsIGxpbmtFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGYWlsZWQgdG8gZ2VuZXJhdGUgcmVzZXQgbGluay5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc2V0TGluayA9IChsaW5rRGF0YSBhcyBhbnkpPy5wcm9wZXJ0aWVzPy5hY3Rpb25fbGluaztcbiAgICBpZiAoIXJlc2V0TGluaykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkNvdWxkIG5vdCByZXRyaWV2ZSByZXNldCBsaW5rLlwiIH07XG5cbiAgICBjb25zdCB7IHNlbmRFbWFpbCB9ID0gYXdhaXQgaW1wb3J0KFwiQC9saWIvZW1haWxcIik7XG4gICAgY29uc3QgeyBvaywgZXJyb3I6IGVtYWlsRXJyb3IgfSA9IGF3YWl0IHNlbmRFbWFpbCh7XG4gICAgICAgIHRvOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgc3ViamVjdDogYFJlc2V0IHlvdXIgJHtiaXpOYW1lfSBwYXNzd29yZGAsXG4gICAgICAgIGh0bWw6IGBcbjwhRE9DVFlQRSBodG1sPlxuPGh0bWw+XG48Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBHZW9yZ2lhLCBzZXJpZjsgYmFja2dyb3VuZDogI2ZhZmFmOTsgbWFyZ2luOiAwOyBwYWRkaW5nOiA0MHB4IDIwcHg7XCI+XG4gIDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDU2MHB4OyBtYXJnaW46IDAgYXV0bzsgYmFja2dyb3VuZDogd2hpdGU7IGJvcmRlcjogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmc6IDQ4cHg7XCI+XG4gICAgPGgxIHN0eWxlPVwiZm9udC1zaXplOiAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBtYXJnaW46IDAgMCA4cHg7XCI+JHtiaXpOYW1lfTwvaDE+XG4gICAgPHAgc3R5bGU9XCJjb2xvcjogIzczNzM3MzsgZm9udC1zaXplOiAxMXB4OyBsZXR0ZXItc3BhY2luZzogMC4yZW07IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IG1hcmdpbjogMCAwIDQwcHg7XCI+UGFzc3dvcmQgUmVzZXQ8L3A+XG5cbiAgICA8aDIgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7IGZvbnQtd2VpZ2h0OiBub3JtYWw7IGNvbG9yOiAjMTcxNzE3OyBtYXJnaW46IDAgMCAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4wNWVtO1wiPlxuICAgICAgUmVzZXQgeW91ciBwYXNzd29yZFxuICAgIDwvaDI+XG5cbiAgICA8cCBzdHlsZT1cImZvbnQtc2l6ZTogMTRweDsgY29sb3I6ICM1MjUyNTI7IGxpbmUtaGVpZ2h0OiAxLjg7IG1hcmdpbjogMCAwIDMycHg7XCI+XG4gICAgICBBbiBhZG1pbiBoYXMgcmVxdWVzdGVkIGEgcGFzc3dvcmQgcmVzZXQgZm9yIHlvdXIgYWNjb3VudC4gQ2xpY2sgdGhlIGJ1dHRvbiBiZWxvdyB0byBzZXQgYSBuZXcgcGFzc3dvcmQuIFRoaXMgbGluayBleHBpcmVzIGluIDEgaG91ci5cbiAgICA8L3A+XG5cbiAgICA8YSBocmVmPVwiJHtyZXNldExpbmt9XCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazsgYmFja2dyb3VuZDogIzE3MTcxNzsgY29sb3I6IHdoaXRlOyB0ZXh0LWRlY29yYXRpb246IG5vbmU7IGZvbnQtc2l6ZTogMTBweDsgbGV0dGVyLXNwYWNpbmc6IDAuMmVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBwYWRkaW5nOiAxNnB4IDMycHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC13ZWlnaHQ6IDcwMDsgbWFyZ2luLWJvdHRvbTogMzJweDtcIj5cbiAgICAgIFJlc2V0IE15IFBhc3N3b3JkIOKGklxuICAgIDwvYT5cblxuICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxM3B4OyBjb2xvcjogIzczNzM3MzsgbGluZS1oZWlnaHQ6IDEuODsgbWFyZ2luOiAwIDAgMzJweDtcIj5cbiAgICAgIElmIHlvdSBkaWQgbm90IGV4cGVjdCB0aGlzIGVtYWlsLCB5b3UgY2FuIHNhZmVseSBpZ25vcmUgaXQg4oCUIHlvdXIgYWNjb3VudCByZW1haW5zIHNlY3VyZS5cbiAgICA8L3A+XG5cbiAgICA8ZGl2IHN0eWxlPVwiYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmctdG9wOiAyNHB4OyBtYXJnaW4tdG9wOiAyNHB4O1wiPlxuICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiAjYTNhM2EzOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyBtYXJnaW46IDA7XCI+XG4gICAgICAgICR7Yml6TmFtZX1cbiAgICAgIDwvcD5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YCxcbiAgICB9KTtcblxuICAgIGlmICghb2spIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGVtYWlsIGZhaWxlZDpcIiwgZW1haWxFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJSZXNldCBsaW5rIGdlbmVyYXRlZCBidXQgZW1haWwgZmFpbGVkIHRvIHNlbmQuXCIgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6ImlUQWtKc0Isa01BQUEifQ==
}),
"[project]/src/app/(dashboard)/settings/TeamTab.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeamTab",
    ()=>TeamTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.js [app-client] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-plus.js [app-client] (ecmascript) <export default as UserPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key-round.js [app-client] (ecmascript) <export default as KeyRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$7b9476__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/data:7b9476 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$77941c__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/data:77941c [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$0b49c5__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/data:0b49c5 [app-client] (ecmascript) <text/javascript>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const ROLE_LABELS = {
    owner: "Owner",
    admin: "Admin",
    sales_staff: "Sales Staff"
};
const ROLE_COLORS = {
    owner: "bg-black text-white",
    admin: "bg-neutral-800 text-white",
    sales_staff: "bg-neutral-100 text-neutral-700"
};
const DASHBOARD_ROLES = [
    "owner",
    "admin",
    "sales_staff"
];
function TeamTab() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("members");
    const [members, setMembers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [invites, setInvites] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [logs, setLogs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [showModal, setShowModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [inviteEmail, setInviteEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [inviteName, setInviteName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [invitePhone, setInvitePhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [inviteRole, setInviteRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("sales_staff");
    const [inviting, setInviting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Filter states
    const [filterUserId, setFilterUserId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("all");
    const [filterAction, setFilterAction] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("all");
    const [filterDate, setFilterDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date().toISOString().split('T')[0]);
    const [allStaff, setAllStaff] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Pagination states
    const [page, setPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [hasMore, setHasMore] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const PAGE_SIZE = 50;
    const fetchData = async (isLoadMore = false)=>{
        if (!isLoadMore) setLoading(true);
        if (activeTab === "members") {
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("profiles").select("id, email, full_name, role, created_at").in("role", DASHBOARD_ROLES).order("created_at", {
                ascending: true
            });
            if (data) {
                setMembers(data);
            }
        } else if (activeTab === "pending") {
            const { data: data_0 } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("team_invitations").select("*").eq("status", "pending").order("created_at", {
                ascending: false
            });
            if (data_0) setInvites(data_0);
        } else if (activeTab === "logs") {
            const startOfDay = `${filterDate}T00:00:00.000Z`;
            const endOfDay = `${filterDate}T23:59:59.999Z`;
            let query = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("activity_logs").select("*, profiles(full_name, email)").gte("created_at", startOfDay).lte("created_at", endOfDay).order("created_at", {
                ascending: false
            }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
            if (filterUserId !== "all") {
                query = query.eq("user_id", filterUserId);
            }
            if (filterAction !== "all") {
                query = query.eq("action_type", filterAction);
            }
            const { data: data_1 } = await query;
            if (data_1) {
                if (isLoadMore) {
                    setLogs((prev)=>[
                            ...prev,
                            ...data_1
                        ]);
                } else {
                    setLogs(data_1);
                }
                setHasMore(data_1.length === PAGE_SIZE);
            }
        }
        if (!isLoadMore) setLoading(false);
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TeamTab.useEffect": ()=>{
            setPage(0); // Reset page on filter change
            fetchData();
        }
    }["TeamTab.useEffect"], [
        activeTab,
        filterUserId,
        filterAction,
        filterDate
    ]);
    // Handle Load More
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TeamTab.useEffect": ()=>{
            if (page > 0) {
                fetchData(true);
            }
        }
    }["TeamTab.useEffect"], [
        page
    ]);
    // Fetch staff list for logs filter — dashboard roles only, independent of active tab
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TeamTab.useEffect": ()=>{
            const fetchStaff = {
                "TeamTab.useEffect.fetchStaff": async ()=>{
                    const { data: data_2 } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("profiles").select("id, full_name, email, role").in("role", DASHBOARD_ROLES).order("full_name", {
                        ascending: true
                    });
                    if (data_2) {
                        setAllStaff(data_2.map({
                            "TeamTab.useEffect.fetchStaff": (d)=>({
                                    id: d.id,
                                    full_name: d.full_name || d.email
                                })
                        }["TeamTab.useEffect.fetchStaff"]));
                    }
                }
            }["TeamTab.useEffect.fetchStaff"];
            fetchStaff();
        }
    }["TeamTab.useEffect"], []); // empty deps — runs once on mount
    const handleInvite = async (e)=>{
        e.preventDefault();
        setInviting(true);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$7b9476__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["inviteTeamMember"])({
                fullName: inviteName,
                email: inviteEmail,
                phone: invitePhone || undefined,
                role: inviteRole
            });
            if (!res.success) {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(res.error || "Invite failed");
            } else {
                if (res.warning) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(res.warning); // the custom toast component maps this as an error/alert visually
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(`Invitation sent to ${inviteEmail}`);
                }
                setShowModal(false);
                setInviteEmail("");
                setInviteName("");
                setInvitePhone("");
                if (activeTab === "pending") fetchData();
            }
        } catch (err) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("An unexpected error occurred while sending the invite.");
            console.error(err);
        } finally{
            setInviting(false);
        }
    };
    const handleRevoke = async (id, email)=>{
        if (!confirm(`Revoke invitation for ${email}?`)) return;
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("team_invitations").update({
            status: "revoked"
        }).eq("id", id);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to revoke invite.");
            return;
        }
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Invitation revoked.");
        fetchData();
    };
    const [removingId, setRemovingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sendingResetId, setSendingResetId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const handleSendReset = async (member)=>{
        if (!confirm(`Send a password reset link to ${member.email}?`)) return;
        setSendingResetId(member.id);
        try {
            const res_0 = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$0b49c5__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["sendPasswordResetLink"])(member.email);
            if (!res_0.success) {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(res_0.error || "Failed to send reset link.");
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(`Reset link sent to ${member.email}.`);
            }
        } catch  {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("An unexpected error occurred.");
        } finally{
            setSendingResetId(null);
        }
    };
    const handleRemove = async (member_0)=>{
        if (member_0.role === "owner" || member_0.role === "admin") {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Admin and owner accounts cannot be removed.");
            return;
        }
        if (!confirm(`Remove ${member_0.email} from the team? They will lose dashboard access.`)) return;
        setRemovingId(member_0.id);
        try {
            const res_1 = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$77941c__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["removeTeamMember"])(member_0.id);
            if (!res_1.success) {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(res_1.error || "Failed to remove member.");
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Team member removed.");
                router.refresh();
                fetchData();
            }
        } catch (err_0) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("An unexpected error occurred.");
            console.error(err_0);
        } finally{
            setRemovingId(null);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8 max-w-5xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveTab("members"),
                                className: `text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'members' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`,
                                children: "Active Members"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 250,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveTab("pending"),
                                className: `text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'pending' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`,
                                children: "Pending Invites"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 253,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveTab("logs"),
                                className: `text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'logs' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`,
                                children: "Activity Logs"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 256,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 249,
                        columnNumber: 17
                    }, this),
                    (activeTab === "members" || activeTab === "pending") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setShowModal(true),
                        className: "flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] md:text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-lg whitespace-nowrap",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 262,
                                columnNumber: 25
                            }, this),
                            "Invite Member"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 261,
                        columnNumber: 74
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                lineNumber: 248,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden",
                children: [
                    activeTab === "members" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "px-8 py-10 text-neutral-400 italic",
                            children: "Loading active members..."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 272,
                            columnNumber: 36
                        }, this) : members.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "px-8 py-10 text-neutral-400 italic",
                            children: "No team members yet."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 272,
                            columnNumber: 141
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full text-left bg-white",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    className: "bg-neutral-50 border-b border-neutral-100",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "User"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 275,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Role"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 276,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Joined"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 277,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-right"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 278,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 274,
                                        columnNumber: 37
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 273,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    className: "divide-y divide-neutral-50 text-sm",
                                    children: members.map((member_1)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            className: "hover:bg-neutral-50 transition-colors",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "font-semibold text-neutral-900",
                                                            children: member_1.full_name || "—"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 284,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-[11px] text-neutral-500 font-mono tracking-tight mt-0.5",
                                                            children: member_1.email
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 285,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 283,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md ${ROLE_COLORS[member_1.role] || "bg-neutral-100 text-neutral-700"}`,
                                                        children: ROLE_LABELS[member_1.role] || member_1.role
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 288,
                                                        columnNumber: 49
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 287,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-neutral-500 text-[11px]",
                                                    children: new Date(member_1.created_at).toLocaleDateString()
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 292,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-right",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-end gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleSendReset(member_1),
                                                                disabled: sendingResetId === member_1.id,
                                                                title: "Send password reset link",
                                                                className: "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-black transition-colors disabled:opacity-50",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__["KeyRound"], {
                                                                        size: 12
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 298,
                                                                        columnNumber: 57
                                                                    }, this),
                                                                    sendingResetId === member_1.id ? "Sending..." : "Reset"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 297,
                                                                columnNumber: 53
                                                            }, this),
                                                            member_1.role !== "owner" && member_1.role !== "admin" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleRemove(member_1),
                                                                disabled: removingId === member_1.id,
                                                                className: "text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50",
                                                                children: removingId === member_1.id ? "Removing..." : "Remove"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 301,
                                                                columnNumber: 112
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 296,
                                                        columnNumber: 49
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 295,
                                                    columnNumber: 45
                                                }, this)
                                            ]
                                        }, member_1.id, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 282,
                                            columnNumber: 62
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 281,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 272,
                            columnNumber: 218
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 271,
                        columnNumber: 45
                    }, this),
                    activeTab === "pending" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "px-8 py-10 text-neutral-400 italic",
                            children: "Loading pending invitations..."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 313,
                            columnNumber: 36
                        }, this) : invites.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "px-8 py-10 text-neutral-400 italic",
                            children: "No pending invitations."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 313,
                            columnNumber: 146
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full text-left bg-white",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    className: "bg-neutral-50 border-b border-neutral-100",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Invitee"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 316,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Role"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 317,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Sent on"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 318,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400 text-right",
                                                children: "Actions"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 319,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 315,
                                        columnNumber: 37
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 314,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    className: "divide-y divide-neutral-50 text-sm",
                                    children: invites.map((invite)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            className: "hover:bg-neutral-50 transition-colors",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "font-semibold text-neutral-900 flex items-center gap-2",
                                                            children: [
                                                                invite.full_name,
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "flex h-1.5 w-1.5 rounded-full bg-amber-400"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                    lineNumber: 327,
                                                                    columnNumber: 53
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 325,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-[11px] text-neutral-500 font-mono tracking-tight mt-0.5",
                                                            children: invite.email
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 329,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 324,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md ${ROLE_COLORS[invite.role] || "bg-neutral-100 text-neutral-700"}`,
                                                        children: ROLE_LABELS[invite.role] || invite.role
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 332,
                                                        columnNumber: 49
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 331,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-neutral-500 text-[11px]",
                                                    children: new Date(invite.created_at).toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 336,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-right",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>handleRevoke(invite.id, invite.email),
                                                        className: "text-[10px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors bg-rose-50 px-3 py-1.5 rounded-md",
                                                        children: "Revoke"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 340,
                                                        columnNumber: 49
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 339,
                                                    columnNumber: 45
                                                }, this)
                                            ]
                                        }, invite.id, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 323,
                                            columnNumber: 60
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 322,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 313,
                            columnNumber: 226
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 312,
                        columnNumber: 45
                    }, this),
                    activeTab === "logs" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-8 py-4 bg-neutral-50 border-b border-neutral-100 flex flex-wrap items-center gap-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400",
                                                children: "Date:"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 354,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "date",
                                                value: filterDate,
                                                onChange: (e_0)=>setFilterDate(e_0.target.value),
                                                className: "bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 355,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 353,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400",
                                                children: "Staff:"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 358,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                value: filterUserId,
                                                onChange: (e_1)=>setFilterUserId(e_1.target.value),
                                                className: "bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "all",
                                                        children: "All Members"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 360,
                                                        columnNumber: 37
                                                    }, this),
                                                    allStaff.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: s.id,
                                                            children: s.full_name
                                                        }, s.id, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 361,
                                                            columnNumber: 56
                                                        }, this))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 359,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 357,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400",
                                                children: "Action:"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 365,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                value: filterAction,
                                                onChange: (e_2)=>setFilterAction(e_2.target.value),
                                                className: "bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "all",
                                                        children: "All Actions"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 367,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "CREATE",
                                                        children: "Created"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 368,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "UPDATE",
                                                        children: "Updated"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 369,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "DELETE",
                                                        children: "Deleted"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 370,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "PACKED_ORDER",
                                                        children: "Packed"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 371,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "DISPATCHED_ORDER",
                                                        children: "Dispatched"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 372,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "DELIVERED_ORDER",
                                                        children: "Delivered"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 373,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "ASSIGNED_RIDER",
                                                        children: "Rider Assigned"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 374,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "INVITE",
                                                        children: "Invited"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 375,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "REMOVE_MEMBER",
                                                        children: "Removed"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 376,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 366,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 364,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            setFilterUserId("all");
                                            setFilterAction("all");
                                            setFilterDate(new Date().toISOString().split('T')[0]);
                                        },
                                        className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-black transition-colors",
                                        children: "Reset Filters"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 379,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 352,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto",
                                children: [
                                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "px-8 py-10 text-neutral-400 italic",
                                        children: "Updating log view..."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 389,
                                        columnNumber: 40
                                    }, this) : logs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "px-8 py-10 text-neutral-400 italic",
                                        children: "No logs found matching your criteria."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 389,
                                        columnNumber: 137
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                        className: "w-full text-left bg-white",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                className: "bg-neutral-50/50 border-b border-neutral-100",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                            children: "Timestamp"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 392,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                            children: "Staff Member"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 393,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                            children: "Action"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 394,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                            children: "Details"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 395,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 391,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 390,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                className: "divide-y divide-neutral-50 text-sm",
                                                children: logs.map((log)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: "hover:bg-neutral-50 transition-colors align-top",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-6 py-4 text-neutral-500 text-[11px] whitespace-nowrap",
                                                                children: new Date(log.created_at).toLocaleString('en-GB', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 400,
                                                                columnNumber: 49
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-6 py-4 whitespace-nowrap",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "font-semibold text-neutral-900",
                                                                        children: log.profiles?.full_name || "Unknown"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 409,
                                                                        columnNumber: 53
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5",
                                                                        children: ROLE_LABELS[log.user_role] || log.user_role
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 410,
                                                                        columnNumber: 53
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 408,
                                                                columnNumber: 49
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-6 py-4 whitespace-nowrap",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `font-mono text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${log.action_type === 'CREATE' ? 'bg-green-50 text-green-700' : log.action_type === 'DELETE' ? 'bg-red-50 text-red-700' : log.action_type === 'UPDATE' ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-700'}`,
                                                                    children: log.action_type
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                    lineNumber: 413,
                                                                    columnNumber: 53
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 412,
                                                                columnNumber: 49
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-6 py-4 min-w-[300px]",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "flex items-center gap-1.5 mb-1.5",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400",
                                                                                children: [
                                                                                    log.resource,
                                                                                    ":"
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                lineNumber: 419,
                                                                                columnNumber: 57
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-medium text-neutral-900",
                                                                                children: log.action_type === 'PACKED_ORDER' ? `Packed Order #${log.details?.order_number}` : log.action_type === 'ASSIGNED_RIDER' ? `Assigned Order #${log.details?.order_number} to ${log.details?.rider_name || 'Rider'}` : log.action_type === 'DISPATCHED_ORDER' ? `Dispatched Order #${log.details?.order_number}` : log.action_type === 'DELIVERED_ORDER' ? `Delivered Order #${log.details?.order_number}` : log.details?.resource_name || "—"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                lineNumber: 420,
                                                                                columnNumber: 57
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 418,
                                                                        columnNumber: 53
                                                                    }, this),
                                                                    ![
                                                                        'PACKED_ORDER',
                                                                        'ASSIGNED_RIDER',
                                                                        'DISPATCHED_ORDER',
                                                                        'DELIVERED_ORDER'
                                                                    ].includes(log.action_type) && log.details?.changes && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "space-y-1.5 mt-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100",
                                                                        children: Object.entries(log.details.changes).map(([field, delta])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "text-[11px] flex flex-wrap items-center gap-x-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "font-semibold text-neutral-500 capitalize",
                                                                                        children: [
                                                                                            field.replace(/_/g, ' '),
                                                                                            ":"
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                        lineNumber: 427,
                                                                                        columnNumber: 69
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-red-500 line-through decoration-red-300 opacity-60",
                                                                                        children: typeof delta.from === 'object' ? 'Data' : String(delta.from ?? 'null')
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                        lineNumber: 428,
                                                                                        columnNumber: 69
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-neutral-400",
                                                                                        children: "→"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                        lineNumber: 431,
                                                                                        columnNumber: 69
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-green-600 font-medium",
                                                                                        children: typeof delta.to === 'object' ? 'Data' : String(delta.to ?? 'null')
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                        lineNumber: 432,
                                                                                        columnNumber: 69
                                                                                    }, this)
                                                                                ]
                                                                            }, field, true, {
                                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                lineNumber: 426,
                                                                                columnNumber: 137
                                                                            }, this))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 425,
                                                                        columnNumber: 182
                                                                    }, this),
                                                                    [
                                                                        'PACKED_ORDER',
                                                                        'ASSIGNED_RIDER',
                                                                        'DISPATCHED_ORDER',
                                                                        'DELIVERED_ORDER'
                                                                    ].includes(log.action_type) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[11px] text-neutral-500 mt-1",
                                                                        children: [
                                                                            "Status: ",
                                                                            log.details?.previous_status,
                                                                            " → ",
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-green-600 font-semibold",
                                                                                children: log.details?.new_status
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                lineNumber: 439,
                                                                                columnNumber: 102
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 438,
                                                                        columnNumber: 157
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 417,
                                                                columnNumber: 49
                                                            }, this)
                                                        ]
                                                    }, log.id, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 399,
                                                        columnNumber: 58
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 398,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 389,
                                        columnNumber: 231
                                    }, this),
                                    hasMore && logs.length >= PAGE_SIZE && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-6 border-t border-neutral-50 flex justify-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setPage((prev_0)=>prev_0 + 1),
                                            className: "px-6 py-2 border border-neutral-200 text-[10px] uppercase tracking-widest font-semibold hover:bg-neutral-50 transition-colors rounded-lg",
                                            children: "Load More"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 447,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 446,
                                        columnNumber: 69
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 388,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 350,
                        columnNumber: 42
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                lineNumber: 268,
                columnNumber: 13
            }, this),
            showModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white w-full max-w-md rounded-2xl border border-neutral-200 shadow-2xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-8 py-5 border-b border-neutral-100 flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "font-serif text-lg tracking-widest uppercase",
                                    children: "Invite New Member"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 459,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setShowModal(false),
                                    className: "text-neutral-400 hover:text-black",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 461,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 460,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 458,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleInvite,
                            className: "p-8 space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Full Name"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 466,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            required: true,
                                            value: inviteName,
                                            onChange: (e_3)=>setInviteName(e_3.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                            placeholder: "Ama Staff"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 467,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 465,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Email Address"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 470,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "email",
                                            required: true,
                                            value: inviteEmail,
                                            onChange: (e_4)=>setInviteEmail(e_4.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                            placeholder: "ama@misstokyo.com"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 471,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 469,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Phone Number (Optional)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 474,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: invitePhone,
                                            onChange: (e_5)=>setInvitePhone(e_5.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                            placeholder: "+233..."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 475,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 473,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Role Assignment"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 478,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: inviteRole,
                                            onChange: (e_6)=>setInviteRole(e_6.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors cursor-pointer appearance-none",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "sales_staff",
                                                    children: "Sales Staff"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 480,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "admin",
                                                    children: "Admin"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 481,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "owner",
                                                    children: "Owner"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 482,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 479,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 477,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3 pt-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setShowModal(false),
                                            className: "flex-1 py-3 border border-neutral-200 text-xs uppercase tracking-widest hover:bg-neutral-50 transition-colors rounded-lg",
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 486,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: inviting,
                                            className: "flex-1 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                                    size: 12
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 490,
                                                    columnNumber: 37
                                                }, this),
                                                inviting ? "Sending..." : "Send Invite"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 489,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 485,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 464,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                    lineNumber: 457,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                lineNumber: 456,
                columnNumber: 27
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
        lineNumber: 246,
        columnNumber: 10
    }, this);
}
_s(TeamTab, "K/IHPfP6WW2BGLHP9jJ6mPHB8Z4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = TeamTab;
var _c;
__turbopack_context__.k.register(_c, "TeamTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BusinessSettingsTab",
    ()=>BusinessSettingsTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const DEFAULT = {
    store_name: "",
    store_tagline: "",
    store_description: "",
    store_email: "",
    store_phone: "",
    store_address: "",
    social_instagram: "",
    social_tiktok: "",
    social_facebook: "",
    social_twitter: "",
    social_pinterest: "",
    social_youtube: "",
    social_snapchat: "",
    social_threads: "",
    instagram_access_token: ""
};
const INPUT_CLASS = "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors";
const LABEL_CLASS = "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2";
const SOCIAL_PLATFORMS = [
    {
        key: "social_instagram",
        label: "Instagram"
    },
    {
        key: "social_tiktok",
        label: "TikTok"
    },
    {
        key: "social_facebook",
        label: "Facebook"
    },
    {
        key: "social_twitter",
        label: "Twitter / X"
    },
    {
        key: "social_pinterest",
        label: "Pinterest"
    },
    {
        key: "social_youtube",
        label: "YouTube"
    },
    {
        key: "social_snapchat",
        label: "Snapchat"
    },
    {
        key: "social_threads",
        label: "Threads"
    }
];
function BusinessSettingsTab() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(61);
    if ($[0] !== "324797bf4eed4ac4dfbad8b7420ce3ef44c98e775c8847816731dd9ab7b38690") {
        for(let $i = 0; $i < 61; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "324797bf4eed4ac4dfbad8b7420ce3ef44c98e775c8847816731dd9ab7b38690";
    }
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    let t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = ({
            "BusinessSettingsTab[useEffect()]": ()=>{
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").select("*").eq("id", "singleton").single().then({
                    "BusinessSettingsTab[useEffect() > (anonymous)()]": (t2)=>{
                        const { data } = t2;
                        if (data) {
                            setForm({
                                store_name: data.store_name || "",
                                store_tagline: data.store_tagline || "",
                                store_description: data.store_description || "",
                                store_email: data.store_email || "",
                                store_phone: data.store_phone || "",
                                store_address: data.store_address || "",
                                social_instagram: data.social_instagram || "",
                                social_tiktok: data.social_tiktok || "",
                                social_facebook: data.social_facebook || "",
                                social_twitter: data.social_twitter || "",
                                social_pinterest: data.social_pinterest || "",
                                social_youtube: data.social_youtube || "",
                                social_snapchat: data.social_snapchat || "",
                                social_threads: data.social_threads || "",
                                instagram_access_token: data.instagram_access_token || ""
                            });
                        }
                        setLoading(false);
                    }
                }["BusinessSettingsTab[useEffect() > (anonymous)()]"]);
            }
        })["BusinessSettingsTab[useEffect()]"];
        t1 = [];
        $[1] = t0;
        $[2] = t1;
    } else {
        t0 = $[1];
        t1 = $[2];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "BusinessSettingsTab[set]": (key, value)=>setForm({
                    "BusinessSettingsTab[set > setForm()]": (prev)=>({
                            ...prev,
                            [key]: value
                        })
                }["BusinessSettingsTab[set > setForm()]"])
        })["BusinessSettingsTab[set]"];
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    const set = t2;
    let t3;
    if ($[4] !== form) {
        t3 = ({
            "BusinessSettingsTab[handleSave]": async ()=>{
                setSaving(true);
                const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").upsert({
                    id: "singleton",
                    ...form
                }, {
                    onConflict: "id"
                });
                setSaving(false);
                if (error) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to save settings");
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Settings saved");
                }
            }
        })["BusinessSettingsTab[handleSave]"];
        $[4] = form;
        $[5] = t3;
    } else {
        t3 = $[5];
    }
    const handleSave = t3;
    if (loading) {
        let t4;
        if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
            t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-neutral-400 italic font-serif",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                lineNumber: 169,
                columnNumber: 12
            }, this);
            $[6] = t4;
        } else {
            t4 = $[6];
        }
        return t4;
    }
    let t4;
    let t5;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
            children: "Store Information"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 179,
            columnNumber: 10
        }, this);
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: LABEL_CLASS,
            children: "Store Name"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 180,
            columnNumber: 10
        }, this);
        $[7] = t4;
        $[8] = t5;
    } else {
        t4 = $[7];
        t5 = $[8];
    }
    let t6;
    if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = ({
            "BusinessSettingsTab[<input>.onChange]": (e)=>set("store_name", e.target.value)
        })["BusinessSettingsTab[<input>.onChange]"];
        $[9] = t6;
    } else {
        t6 = $[9];
    }
    let t7;
    if ($[10] !== form.store_name) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t5,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: form.store_name,
                    onChange: t6,
                    className: INPUT_CLASS,
                    placeholder: "Miss Tokyo"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                    lineNumber: 198,
                    columnNumber: 19
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 198,
            columnNumber: 10
        }, this);
        $[10] = form.store_name;
        $[11] = t7;
    } else {
        t7 = $[11];
    }
    let t8;
    if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: LABEL_CLASS,
            children: [
                "Tagline",
                " ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-neutral-400 normal-case tracking-normal",
                    children: "(max 160 chars)"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                    lineNumber: 206,
                    columnNumber: 53
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 206,
            columnNumber: 10
        }, this);
        $[12] = t8;
    } else {
        t8 = $[12];
    }
    let t9;
    if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = ({
            "BusinessSettingsTab[<textarea>.onChange]": (e_0)=>set("store_tagline", e_0.target.value)
        })["BusinessSettingsTab[<textarea>.onChange]"];
        $[13] = t9;
    } else {
        t9 = $[13];
    }
    let t10;
    if ($[14] !== form.store_tagline) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
            rows: 2,
            maxLength: 160,
            value: form.store_tagline,
            onChange: t9,
            className: INPUT_CLASS + " resize-none",
            placeholder: "Luxury footwear crafted for you."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 222,
            columnNumber: 11
        }, this);
        $[14] = form.store_tagline;
        $[15] = t10;
    } else {
        t10 = $[15];
    }
    let t11;
    if ($[16] !== form.store_tagline.length) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 mt-1",
            children: [
                form.store_tagline.length,
                " / 160"
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 230,
            columnNumber: 11
        }, this);
        $[16] = form.store_tagline.length;
        $[17] = t11;
    } else {
        t11 = $[17];
    }
    let t12;
    if ($[18] !== t10 || $[19] !== t11) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t8,
                t10,
                t11
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 238,
            columnNumber: 11
        }, this);
        $[18] = t10;
        $[19] = t11;
        $[20] = t12;
    } else {
        t12 = $[20];
    }
    let t13;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: LABEL_CLASS,
            children: "Store Email"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 247,
            columnNumber: 11
        }, this);
        $[21] = t13;
    } else {
        t13 = $[21];
    }
    let t14;
    if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
        t14 = ({
            "BusinessSettingsTab[<input>.onChange]": (e_1)=>set("store_email", e_1.target.value)
        })["BusinessSettingsTab[<input>.onChange]"];
        $[22] = t14;
    } else {
        t14 = $[22];
    }
    let t15;
    if ($[23] !== form.store_email) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t13,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "email",
                    value: form.store_email,
                    onChange: t14,
                    className: INPUT_CLASS,
                    placeholder: "hello@misstokyo.com"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                    lineNumber: 263,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 263,
            columnNumber: 11
        }, this);
        $[23] = form.store_email;
        $[24] = t15;
    } else {
        t15 = $[24];
    }
    let t16;
    if ($[25] === Symbol.for("react.memo_cache_sentinel")) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: LABEL_CLASS,
            children: "Phone"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 271,
            columnNumber: 11
        }, this);
        $[25] = t16;
    } else {
        t16 = $[25];
    }
    let t17;
    if ($[26] === Symbol.for("react.memo_cache_sentinel")) {
        t17 = ({
            "BusinessSettingsTab[<input>.onChange]": (e_2)=>set("store_phone", e_2.target.value)
        })["BusinessSettingsTab[<input>.onChange]"];
        $[26] = t17;
    } else {
        t17 = $[26];
    }
    let t18;
    if ($[27] !== form.store_phone) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t16,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: form.store_phone,
                    onChange: t17,
                    className: INPUT_CLASS,
                    placeholder: "+234 800 000 0000"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                    lineNumber: 287,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 287,
            columnNumber: 11
        }, this);
        $[27] = form.store_phone;
        $[28] = t18;
    } else {
        t18 = $[28];
    }
    let t19;
    if ($[29] === Symbol.for("react.memo_cache_sentinel")) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: LABEL_CLASS,
            children: "Address"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 295,
            columnNumber: 11
        }, this);
        $[29] = t19;
    } else {
        t19 = $[29];
    }
    let t20;
    if ($[30] === Symbol.for("react.memo_cache_sentinel")) {
        t20 = ({
            "BusinessSettingsTab[<textarea>.onChange]": (e_3)=>set("store_address", e_3.target.value)
        })["BusinessSettingsTab[<textarea>.onChange]"];
        $[30] = t20;
    } else {
        t20 = $[30];
    }
    let t21;
    if ($[31] !== form.store_address) {
        t21 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t19,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    rows: 3,
                    value: form.store_address,
                    onChange: t20,
                    className: INPUT_CLASS + " resize-none",
                    placeholder: "123 Victoria Island, Lagos, Nigeria"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                    lineNumber: 311,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 311,
            columnNumber: 11
        }, this);
        $[31] = form.store_address;
        $[32] = t21;
    } else {
        t21 = $[32];
    }
    let t22;
    if ($[33] !== t12 || $[34] !== t15 || $[35] !== t18 || $[36] !== t21 || $[37] !== t7) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border border-neutral-200 p-6 space-y-6",
            children: [
                t4,
                t7,
                t12,
                t15,
                t18,
                t21
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 319,
            columnNumber: 11
        }, this);
        $[33] = t12;
        $[34] = t15;
        $[35] = t18;
        $[36] = t21;
        $[37] = t7;
        $[38] = t22;
    } else {
        t22 = $[38];
    }
    let t23;
    if ($[39] === Symbol.for("react.memo_cache_sentinel")) {
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
            children: "Social Links"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 331,
            columnNumber: 11
        }, this);
        $[39] = t23;
    } else {
        t23 = $[39];
    }
    let t24;
    if ($[40] !== form) {
        t24 = SOCIAL_PLATFORMS.map({
            "BusinessSettingsTab[SOCIAL_PLATFORMS.map()]": (t25)=>{
                const { key: key_0, label } = t25;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500 w-28 shrink-0",
                            children: label
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                            lineNumber: 344,
                            columnNumber: 69
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "url",
                            value: form[key_0],
                            onChange: {
                                "BusinessSettingsTab[SOCIAL_PLATFORMS.map() > <input>.onChange]": (e_4)=>set(key_0, e_4.target.value)
                            }["BusinessSettingsTab[SOCIAL_PLATFORMS.map() > <input>.onChange]"],
                            className: INPUT_CLASS,
                            placeholder: "https://"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                            lineNumber: 344,
                            columnNumber: 184
                        }, this)
                    ]
                }, key_0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                    lineNumber: 344,
                    columnNumber: 16
                }, this);
            }
        }["BusinessSettingsTab[SOCIAL_PLATFORMS.map()]"]);
        $[40] = form;
        $[41] = t24;
    } else {
        t24 = $[41];
    }
    let t25;
    if ($[42] !== t24) {
        t25 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border border-neutral-200 p-6 space-y-5",
            children: [
                t23,
                t24
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 356,
            columnNumber: 11
        }, this);
        $[42] = t24;
        $[43] = t25;
    } else {
        t25 = $[43];
    }
    let t26;
    let t27;
    if ($[44] === Symbol.for("react.memo_cache_sentinel")) {
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
            children: "Instagram Feed"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 365,
            columnNumber: 11
        }, this);
        t27 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: LABEL_CLASS,
            children: "Access Token"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 366,
            columnNumber: 11
        }, this);
        $[44] = t26;
        $[45] = t27;
    } else {
        t26 = $[44];
        t27 = $[45];
    }
    let t28;
    if ($[46] === Symbol.for("react.memo_cache_sentinel")) {
        t28 = ({
            "BusinessSettingsTab[<input>.onChange]": (e_5)=>set("instagram_access_token", e_5.target.value)
        })["BusinessSettingsTab[<input>.onChange]"];
        $[46] = t28;
    } else {
        t28 = $[46];
    }
    let t29;
    if ($[47] !== form.instagram_access_token) {
        t29 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "text",
            value: form.instagram_access_token,
            onChange: t28,
            className: INPUT_CLASS,
            placeholder: "IGQVJXb..."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 384,
            columnNumber: 11
        }, this);
        $[47] = form.instagram_access_token;
        $[48] = t29;
    } else {
        t29 = $[48];
    }
    let t30;
    if ($[49] === Symbol.for("react.memo_cache_sentinel")) {
        t30 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 mt-2 leading-relaxed",
            children: "Required to show your live Instagram feed on the homepage. Generate this from the Instagram Basic Display API. Leave blank to show placeholder tiles."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 392,
            columnNumber: 11
        }, this);
        $[49] = t30;
    } else {
        t30 = $[49];
    }
    let t31;
    if ($[50] !== t29) {
        t31 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border border-neutral-200 p-6 space-y-4",
            children: [
                t26,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        t27,
                        t29,
                        t30
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                    lineNumber: 399,
                    columnNumber: 82
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 399,
            columnNumber: 11
        }, this);
        $[50] = t29;
        $[51] = t31;
    } else {
        t31 = $[51];
    }
    const t32 = saving ? "Saving..." : "Save Settings";
    let t33;
    if ($[52] !== handleSave || $[53] !== saving || $[54] !== t32) {
        t33 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-end",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: handleSave,
                disabled: saving,
                className: "px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                children: t32
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                lineNumber: 408,
                columnNumber: 45
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 408,
            columnNumber: 11
        }, this);
        $[52] = handleSave;
        $[53] = saving;
        $[54] = t32;
        $[55] = t33;
    } else {
        t33 = $[55];
    }
    let t34;
    if ($[56] !== t22 || $[57] !== t25 || $[58] !== t31 || $[59] !== t33) {
        t34 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-8 max-w-3xl",
            children: [
                t22,
                t25,
                t31,
                t33
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 418,
            columnNumber: 11
        }, this);
        $[56] = t22;
        $[57] = t25;
        $[58] = t31;
        $[59] = t33;
        $[60] = t34;
    } else {
        t34 = $[60];
    }
    return t34;
}
_s(BusinessSettingsTab, "v1Ih0a1yeeBZDHTltjHmS9ahKQ4=");
_c = BusinessSettingsTab;
var _c;
__turbopack_context__.k.register(_c, "BusinessSettingsTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/ShippingTab.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ShippingTab",
    ()=>ShippingTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const DEFAULT_INSTRUCTIONS = "Ensure you receive an email confirmation confirming your pickup before arriving at the shop. If you arrive before receiving the confirmation email, you'll have to return later to pick up your order. Working Hours: 10 am - 8 pm";
const MAX_CHARS = 500;
const DEFAULT_FORM = {
    pickup_enabled: true,
    pickup_instructions: DEFAULT_INSTRUCTIONS,
    pickup_address: "",
    pickup_contact_phone: "",
    pickup_estimated_wait: "24 hours"
};
function ShippingTab() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(97);
    if ($[0] !== "3d4745374abc556448a685552f8115e4f2e8f8a3440dfa9604230fc5b501c82d") {
        for(let $i = 0; $i < 97; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "3d4745374abc556448a685552f8115e4f2e8f8a3440dfa9604230fc5b501c82d";
    }
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_FORM);
    const [storeAddress, setStoreAddress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [storePhone, setStorePhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const textareaRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    let t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = ({
            "ShippingTab[useEffect()]": ()=>{
                Promise.all([
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("business_settings").select("address, contact").eq("id", "default").single()
                ]).then({
                    "ShippingTab[useEffect() > (anonymous)()]": (t2)=>{
                        const [t3, t4] = t2;
                        const { data: ss } = t3;
                        const { data: biz } = t4;
                        if (ss) {
                            setForm({
                                pickup_enabled: ss.pickup_enabled ?? true,
                                pickup_instructions: ss.pickup_instructions || DEFAULT_INSTRUCTIONS,
                                pickup_address: ss.pickup_address || "",
                                pickup_contact_phone: ss.pickup_contact_phone || "",
                                pickup_estimated_wait: ss.pickup_estimated_wait || "24 hours"
                            });
                        }
                        if (biz) {
                            setStoreAddress(biz.address || "");
                            setStorePhone(biz.contact || "");
                        }
                        setLoading(false);
                    }
                }["ShippingTab[useEffect() > (anonymous)()]"]);
            }
        })["ShippingTab[useEffect()]"];
        t1 = [];
        $[1] = t0;
        $[2] = t1;
    } else {
        t0 = $[1];
        t1 = $[2];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "ShippingTab[useEffect()]": ()=>{
                const el = textareaRef.current;
                if (!el) {
                    return;
                }
                el.style.height = "auto";
                const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
                const minH = lineHeight * 4;
                const maxH = lineHeight * 8;
                el.style.height = `${Math.min(maxH, Math.max(minH, el.scrollHeight))}px`;
            }
        })["ShippingTab[useEffect()]"];
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    let t3;
    if ($[4] !== form.pickup_instructions) {
        t3 = [
            form.pickup_instructions
        ];
        $[4] = form.pickup_instructions;
        $[5] = t3;
    } else {
        t3 = $[5];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t2, t3);
    let t4;
    if ($[6] !== form.pickup_address || $[7] !== form.pickup_contact_phone || $[8] !== form.pickup_enabled || $[9] !== form.pickup_estimated_wait || $[10] !== form.pickup_instructions) {
        t4 = ({
            "ShippingTab[handleSave]": async ()=>{
                setSaving(true);
                const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").upsert({
                    id: "singleton",
                    pickup_enabled: form.pickup_enabled,
                    pickup_instructions: form.pickup_instructions,
                    pickup_address: form.pickup_address || null,
                    pickup_contact_phone: form.pickup_contact_phone || null,
                    pickup_estimated_wait: form.pickup_estimated_wait,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: "id"
                });
                setSaving(false);
                if (error) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to save pickup settings.");
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Pickup settings saved.");
                }
            }
        })["ShippingTab[handleSave]"];
        $[6] = form.pickup_address;
        $[7] = form.pickup_contact_phone;
        $[8] = form.pickup_enabled;
        $[9] = form.pickup_estimated_wait;
        $[10] = form.pickup_instructions;
        $[11] = t4;
    } else {
        t4 = $[11];
    }
    const handleSave = t4;
    const previewAddress = form.pickup_address || storeAddress || "\u2014";
    const previewPhone = form.pickup_contact_phone || storePhone || "\u2014";
    const charCount = form.pickup_instructions.length;
    if (loading) {
        let t5;
        if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
            t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-neutral-400 italic font-serif py-8",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                lineNumber: 148,
                columnNumber: 12
            }, this);
            $[12] = t5;
        } else {
            t5 = $[12];
        }
        return t5;
    }
    const disabled = !form.pickup_enabled;
    let t5;
    if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
            children: "Store Pickup"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 158,
            columnNumber: 10
        }, this);
        $[13] = t5;
    } else {
        t5 = $[13];
    }
    let t6;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = ({
            "ShippingTab[<button>.onClick]": ()=>setForm(_ShippingTabButtonOnClickSetForm)
        })["ShippingTab[<button>.onClick]"];
        $[14] = t6;
    } else {
        t6 = $[14];
    }
    const t7 = `relative w-10 h-5 rounded-full transition-colors ${form.pickup_enabled ? "bg-black" : "bg-neutral-300"}`;
    const t8 = `absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.pickup_enabled ? "translate-x-5" : "translate-x-0"}`;
    let t9;
    if ($[15] !== t8) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: t8
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 176,
            columnNumber: 10
        }, this);
        $[15] = t8;
        $[16] = t9;
    } else {
        t9 = $[16];
    }
    let t10;
    if ($[17] !== form.pickup_enabled || $[18] !== t7 || $[19] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            role: "switch",
            "aria-checked": form.pickup_enabled,
            onClick: t6,
            className: t7,
            children: t9
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 184,
            columnNumber: 11
        }, this);
        $[17] = form.pickup_enabled;
        $[18] = t7;
        $[19] = t9;
        $[20] = t10;
    } else {
        t10 = $[20];
    }
    let t11;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-700",
            children: "Enable store pickup option at checkout"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 194,
            columnNumber: 11
        }, this);
        $[21] = t11;
    } else {
        t11 = $[21];
    }
    let t12;
    if ($[22] !== t10) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "flex items-center gap-3 cursor-pointer",
            children: [
                t10,
                t11
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 201,
            columnNumber: 11
        }, this);
        $[22] = t10;
        $[23] = t12;
    } else {
        t12 = $[23];
    }
    let t13;
    if ($[24] !== form.pickup_enabled) {
        t13 = !form.pickup_enabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "mt-2 ml-[52px] text-[10px] uppercase tracking-widest text-amber-600",
            children: "Store pickup is disabled. Customers will not see this option at checkout."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 209,
            columnNumber: 35
        }, this);
        $[24] = form.pickup_enabled;
        $[25] = t13;
    } else {
        t13 = $[25];
    }
    let t14;
    if ($[26] !== t12 || $[27] !== t13) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t12,
                t13
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 217,
            columnNumber: 11
        }, this);
        $[26] = t12;
        $[27] = t13;
        $[28] = t14;
    } else {
        t14 = $[28];
    }
    const t15 = `space-y-6 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`;
    let t16;
    if ($[29] === Symbol.for("react.memo_cache_sentinel")) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: "Pickup Instructions"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 227,
            columnNumber: 11
        }, this);
        $[29] = t16;
    } else {
        t16 = $[29];
    }
    let t17;
    if ($[30] === Symbol.for("react.memo_cache_sentinel")) {
        t17 = ({
            "ShippingTab[<textarea>.onChange]": (e)=>{
                if (e.target.value.length <= MAX_CHARS) {
                    setForm({
                        "ShippingTab[<textarea>.onChange > setForm()]": (p_0)=>({
                                ...p_0,
                                pickup_instructions: e.target.value
                            })
                    }["ShippingTab[<textarea>.onChange > setForm()]"]);
                }
            }
        })["ShippingTab[<textarea>.onChange]"];
        $[30] = t17;
    } else {
        t17 = $[30];
    }
    let t18;
    if ($[31] === Symbol.for("react.memo_cache_sentinel")) {
        t18 = {
            whiteSpace: "pre-wrap"
        };
        $[31] = t18;
    } else {
        t18 = $[31];
    }
    let t19;
    if ($[32] !== form.pickup_instructions) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
            ref: textareaRef,
            value: form.pickup_instructions,
            onChange: t17,
            rows: 4,
            className: "w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black transition-colors resize-none text-sm leading-relaxed",
            placeholder: DEFAULT_INSTRUCTIONS,
            style: t18
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 261,
            columnNumber: 11
        }, this);
        $[32] = form.pickup_instructions;
        $[33] = t19;
    } else {
        t19 = $[33];
    }
    let t20;
    if ($[34] === Symbol.for("react.memo_cache_sentinel")) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 tracking-wider",
            children: "This text appears verbatim in pickup order emails and receipts."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 269,
            columnNumber: 11
        }, this);
        $[34] = t20;
    } else {
        t20 = $[34];
    }
    const t21 = `text-[10px] tracking-wider shrink-0 ${charCount > MAX_CHARS * 0.9 ? "text-amber-600" : "text-neutral-400"}`;
    let t22;
    if ($[35] !== charCount || $[36] !== t21) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-start justify-between mt-1 gap-2",
            children: [
                t20,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: t21,
                    children: [
                        charCount,
                        " / ",
                        MAX_CHARS
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 277,
                    columnNumber: 77
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 277,
            columnNumber: 11
        }, this);
        $[35] = charCount;
        $[36] = t21;
        $[37] = t22;
    } else {
        t22 = $[37];
    }
    let t23;
    if ($[38] !== t19 || $[39] !== t22) {
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t16,
                t19,
                t22
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 286,
            columnNumber: 11
        }, this);
        $[38] = t19;
        $[39] = t22;
        $[40] = t23;
    } else {
        t23 = $[40];
    }
    let t24;
    if ($[41] === Symbol.for("react.memo_cache_sentinel")) {
        t24 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: [
                "Pickup Address ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "font-normal normal-case tracking-normal text-neutral-400",
                    children: "(optional)"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 295,
                    columnNumber: 125
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 295,
            columnNumber: 11
        }, this);
        $[41] = t24;
    } else {
        t24 = $[41];
    }
    let t25;
    if ($[42] === Symbol.for("react.memo_cache_sentinel")) {
        t25 = ({
            "ShippingTab[<input>.onChange]": (e_0)=>setForm({
                    "ShippingTab[<input>.onChange > setForm()]": (p_1)=>({
                            ...p_1,
                            pickup_address: e_0.target.value
                        })
                }["ShippingTab[<input>.onChange > setForm()]"])
        })["ShippingTab[<input>.onChange]"];
        $[42] = t25;
    } else {
        t25 = $[42];
    }
    let t26;
    if ($[43] !== form.pickup_address) {
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "text",
            value: form.pickup_address,
            onChange: t25,
            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
            placeholder: "Leave blank to use your store address"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 316,
            columnNumber: 11
        }, this);
        $[43] = form.pickup_address;
        $[44] = t26;
    } else {
        t26 = $[44];
    }
    let t27;
    if ($[45] !== form.pickup_address || $[46] !== storeAddress) {
        t27 = !form.pickup_address && storeAddress && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 mt-1 tracking-wider",
            children: [
                "Using store address: ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-neutral-600",
                    children: storeAddress
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 324,
                    columnNumber: 136
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 324,
            columnNumber: 51
        }, this);
        $[45] = form.pickup_address;
        $[46] = storeAddress;
        $[47] = t27;
    } else {
        t27 = $[47];
    }
    let t28;
    if ($[48] !== t26 || $[49] !== t27) {
        t28 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t24,
                t26,
                t27
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 333,
            columnNumber: 11
        }, this);
        $[48] = t26;
        $[49] = t27;
        $[50] = t28;
    } else {
        t28 = $[50];
    }
    let t29;
    if ($[51] === Symbol.for("react.memo_cache_sentinel")) {
        t29 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: [
                "Pickup Contact Number ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "font-normal normal-case tracking-normal text-neutral-400",
                    children: "(optional)"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 342,
                    columnNumber: 132
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 342,
            columnNumber: 11
        }, this);
        $[51] = t29;
    } else {
        t29 = $[51];
    }
    let t30;
    if ($[52] === Symbol.for("react.memo_cache_sentinel")) {
        t30 = ({
            "ShippingTab[<input>.onChange]": (e_1)=>setForm({
                    "ShippingTab[<input>.onChange > setForm()]": (p_2)=>({
                            ...p_2,
                            pickup_contact_phone: e_1.target.value
                        })
                }["ShippingTab[<input>.onChange > setForm()]"])
        })["ShippingTab[<input>.onChange]"];
        $[52] = t30;
    } else {
        t30 = $[52];
    }
    let t31;
    if ($[53] !== form.pickup_contact_phone) {
        t31 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t29,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: form.pickup_contact_phone,
                    onChange: t30,
                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                    placeholder: "Leave blank to use your store phone number"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 363,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 363,
            columnNumber: 11
        }, this);
        $[53] = form.pickup_contact_phone;
        $[54] = t31;
    } else {
        t31 = $[54];
    }
    let t32;
    if ($[55] === Symbol.for("react.memo_cache_sentinel")) {
        t32 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: "Estimated Pickup Ready Time"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 371,
            columnNumber: 11
        }, this);
        $[55] = t32;
    } else {
        t32 = $[55];
    }
    let t33;
    if ($[56] === Symbol.for("react.memo_cache_sentinel")) {
        t33 = ({
            "ShippingTab[<input>.onChange]": (e_2)=>setForm({
                    "ShippingTab[<input>.onChange > setForm()]": (p_3)=>({
                            ...p_3,
                            pickup_estimated_wait: e_2.target.value
                        })
                }["ShippingTab[<input>.onChange > setForm()]"])
        })["ShippingTab[<input>.onChange]"];
        $[56] = t33;
    } else {
        t33 = $[56];
    }
    let t34;
    if ($[57] !== form.pickup_estimated_wait) {
        t34 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "text",
            value: form.pickup_estimated_wait,
            onChange: t33,
            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
            placeholder: "e.g. 24 hours, Same day, 1\u20132 business days"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 392,
            columnNumber: 11
        }, this);
        $[57] = form.pickup_estimated_wait;
        $[58] = t34;
    } else {
        t34 = $[58];
    }
    let t35;
    if ($[59] === Symbol.for("react.memo_cache_sentinel")) {
        t35 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 mt-1 tracking-wider",
            children: "Shown to customers after placing a pickup order."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 400,
            columnNumber: 11
        }, this);
        $[59] = t35;
    } else {
        t35 = $[59];
    }
    let t36;
    if ($[60] !== t34) {
        t36 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t32,
                t34,
                t35
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 407,
            columnNumber: 11
        }, this);
        $[60] = t34;
        $[61] = t36;
    } else {
        t36 = $[61];
    }
    let t37;
    let t38;
    let t39;
    let t40;
    if ($[62] === Symbol.for("react.memo_cache_sentinel")) {
        t37 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-3",
            children: "Preview \u2014 How it appears in emails & receipts"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 418,
            columnNumber: 11
        }, this);
        t38 = {
            backgroundColor: "#F7F2EC",
            padding: "20px",
            borderRadius: "2px",
            border: "1px solid #E8E4DE"
        };
        t39 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            style: {
                fontSize: "13px",
                fontWeight: 700,
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.1em"
            },
            children: "📦 Store Pickup Instructions"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 425,
            columnNumber: 11
        }, this);
        t40 = {
            fontSize: "13px",
            lineHeight: 1.7,
            color: "#404040",
            whiteSpace: "pre-wrap",
            marginBottom: "16px"
        };
        $[62] = t37;
        $[63] = t38;
        $[64] = t39;
        $[65] = t40;
    } else {
        t37 = $[62];
        t38 = $[63];
        t39 = $[64];
        t40 = $[65];
    }
    const t41 = form.pickup_instructions || DEFAULT_INSTRUCTIONS;
    let t42;
    if ($[66] !== t41) {
        t42 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            style: t40,
            children: t41
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 452,
            columnNumber: 11
        }, this);
        $[66] = t41;
        $[67] = t42;
    } else {
        t42 = $[67];
    }
    let t43;
    if ($[68] === Symbol.for("react.memo_cache_sentinel")) {
        t43 = {
            borderTop: "1px solid #DDD8D1",
            paddingTop: "12px",
            fontSize: "12px",
            color: "#525252",
            lineHeight: 2
        };
        $[68] = t43;
    } else {
        t43 = $[68];
    }
    let t44;
    if ($[69] !== previewAddress) {
        t44 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                "📍 ",
                previewAddress
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 473,
            columnNumber: 11
        }, this);
        $[69] = previewAddress;
        $[70] = t44;
    } else {
        t44 = $[70];
    }
    let t45;
    if ($[71] !== previewPhone) {
        t45 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                "📞 ",
                previewPhone
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 481,
            columnNumber: 11
        }, this);
        $[71] = previewPhone;
        $[72] = t45;
    } else {
        t45 = $[72];
    }
    const t46 = form.pickup_estimated_wait || "24 hours";
    let t47;
    if ($[73] !== t46) {
        t47 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                "⏱ Ready in: ",
                t46
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 490,
            columnNumber: 11
        }, this);
        $[73] = t46;
        $[74] = t47;
    } else {
        t47 = $[74];
    }
    let t48;
    if ($[75] !== t44 || $[76] !== t45 || $[77] !== t47) {
        t48 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: t43,
            children: [
                t44,
                t45,
                t47
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 498,
            columnNumber: 11
        }, this);
        $[75] = t44;
        $[76] = t45;
        $[77] = t47;
        $[78] = t48;
    } else {
        t48 = $[78];
    }
    let t49;
    if ($[79] !== t42 || $[80] !== t48) {
        t49 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t37,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: t38,
                    children: [
                        t39,
                        t42,
                        t48
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 508,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 508,
            columnNumber: 11
        }, this);
        $[79] = t42;
        $[80] = t48;
        $[81] = t49;
    } else {
        t49 = $[81];
    }
    let t50;
    if ($[82] !== t15 || $[83] !== t23 || $[84] !== t28 || $[85] !== t31 || $[86] !== t36 || $[87] !== t49) {
        t50 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t15,
            children: [
                t23,
                t28,
                t31,
                t36,
                t49
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 517,
            columnNumber: 11
        }, this);
        $[82] = t15;
        $[83] = t23;
        $[84] = t28;
        $[85] = t31;
        $[86] = t36;
        $[87] = t49;
        $[88] = t50;
    } else {
        t50 = $[88];
    }
    const t51 = saving ? "Saving..." : "Save Pickup Settings";
    let t52;
    if ($[89] !== handleSave || $[90] !== saving || $[91] !== t51) {
        t52 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-end pt-2 border-t border-neutral-100",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: handleSave,
                disabled: saving,
                className: "px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                children: t51
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                lineNumber: 531,
                columnNumber: 78
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 531,
            columnNumber: 11
        }, this);
        $[89] = handleSave;
        $[90] = saving;
        $[91] = t51;
        $[92] = t52;
    } else {
        t52 = $[92];
    }
    let t53;
    if ($[93] !== t14 || $[94] !== t50 || $[95] !== t52) {
        t53 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-8 max-w-4xl",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-8 space-y-6",
                children: [
                    t5,
                    t14,
                    t50,
                    t52
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                lineNumber: 541,
                columnNumber: 48
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 541,
            columnNumber: 11
        }, this);
        $[93] = t14;
        $[94] = t50;
        $[95] = t52;
        $[96] = t53;
    } else {
        t53 = $[96];
    }
    return t53;
}
_s(ShippingTab, "QqEJshnmd7y31pEM8QQdNXKr7cs=");
_c = ShippingTab;
function _ShippingTabButtonOnClickSetForm(p) {
    return {
        ...p,
        pickup_enabled: !p.pickup_enabled
    };
}
var _c;
__turbopack_context__.k.register(_c, "ShippingTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/ProductPageTab.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProductPageTab",
    ()=>ProductPageTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const DEFAULTS = {
    pdp_show_trust_strip: true,
    pdp_show_reviews: true,
    pdp_show_product_details: true,
    pdp_show_care_instructions: true,
    pdp_show_delivery_returns: true
};
function Toggle(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(21);
    if ($[0] !== "47392708b78780e195e72227117514901b80be95d5183628ce0bd8b345d76e47") {
        for(let $i = 0; $i < 21; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "47392708b78780e195e72227117514901b80be95d5183628ce0bd8b345d76e47";
    }
    const { checked, onChange, label, description } = t0;
    let t1;
    if ($[1] !== label) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-sm font-medium text-neutral-800",
            children: label
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 37,
            columnNumber: 10
        }, this);
        $[1] = label;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    let t2;
    if ($[3] !== description) {
        t2 = description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-xs text-neutral-400 mt-0.5 leading-snug",
            children: description
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 45,
            columnNumber: 25
        }, this);
        $[3] = description;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    let t3;
    if ($[5] !== t1 || $[6] !== t2) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 pr-6",
            children: [
                t1,
                t2
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 53,
            columnNumber: 10
        }, this);
        $[5] = t1;
        $[6] = t2;
        $[7] = t3;
    } else {
        t3 = $[7];
    }
    let t4;
    if ($[8] !== checked || $[9] !== onChange) {
        t4 = ({
            "Toggle[<button>.onClick]": ()=>onChange(!checked)
        })["Toggle[<button>.onClick]"];
        $[8] = checked;
        $[9] = onChange;
        $[10] = t4;
    } else {
        t4 = $[10];
    }
    const t5 = `relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? "bg-black" : "bg-neutral-200"}`;
    const t6 = `pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-4" : "translate-x-0"}`;
    let t7;
    if ($[11] !== t6) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: t6
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 75,
            columnNumber: 10
        }, this);
        $[11] = t6;
        $[12] = t7;
    } else {
        t7 = $[12];
    }
    let t8;
    if ($[13] !== checked || $[14] !== t4 || $[15] !== t5 || $[16] !== t7) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            role: "switch",
            "aria-checked": checked,
            onClick: t4,
            className: t5,
            children: t7
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 83,
            columnNumber: 10
        }, this);
        $[13] = checked;
        $[14] = t4;
        $[15] = t5;
        $[16] = t7;
        $[17] = t8;
    } else {
        t8 = $[17];
    }
    let t9;
    if ($[18] !== t3 || $[19] !== t8) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between py-4 border-b border-neutral-100",
            children: [
                t3,
                t8
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 94,
            columnNumber: 10
        }, this);
        $[18] = t3;
        $[19] = t8;
        $[20] = t9;
    } else {
        t9 = $[20];
    }
    return t9;
}
_c = Toggle;
function ProductPageTab() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(37);
    if ($[0] !== "47392708b78780e195e72227117514901b80be95d5183628ce0bd8b345d76e47") {
        for(let $i = 0; $i < 37; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "47392708b78780e195e72227117514901b80be95d5183628ce0bd8b345d76e47";
    }
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULTS);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    let t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = ({
            "ProductPageTab[useEffect()]": ()=>{
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").select("pdp_show_trust_strip, pdp_show_reviews, pdp_show_product_details, pdp_show_care_instructions, pdp_show_delivery_returns").eq("id", "singleton").single().then({
                    "ProductPageTab[useEffect() > (anonymous)()]": (t2)=>{
                        const { data } = t2;
                        if (data) {
                            setSettings({
                                ...DEFAULTS,
                                ...data
                            });
                        }
                        setLoading(false);
                    }
                }["ProductPageTab[useEffect() > (anonymous)()]"]);
            }
        })["ProductPageTab[useEffect()]"];
        t1 = [];
        $[1] = t0;
        $[2] = t1;
    } else {
        t0 = $[1];
        t1 = $[2];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "ProductPageTab[set]": (key, val)=>setSettings({
                    "ProductPageTab[set > setSettings()]": (s)=>({
                            ...s,
                            [key]: val
                        })
                }["ProductPageTab[set > setSettings()]"])
        })["ProductPageTab[set]"];
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    const set = t2;
    let t3;
    if ($[4] !== settings) {
        t3 = ({
            "ProductPageTab[save]": async ()=>{
                setSaving(true);
                const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").update(settings).eq("id", "singleton");
                setSaving(false);
                if (error) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to save: " + error.message);
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Product page settings saved");
                }
            }
        })["ProductPageTab[save]"];
        $[4] = settings;
        $[5] = t3;
    } else {
        t3 = $[5];
    }
    const save = t3;
    if (loading) {
        let t4;
        if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
            t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-neutral-400",
                children: "Loading…"
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                lineNumber: 183,
                columnNumber: 12
            }, this);
            $[6] = t4;
        } else {
            t4 = $[6];
        }
        return t4;
    }
    let t4;
    let t5;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xs font-semibold uppercase tracking-widest mb-1",
            children: "Product Page Sections"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 193,
            columnNumber: 10
        }, this);
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-sm text-neutral-500 mb-6",
            children: "Control which sections are visible on every product detail page. Changes take effect after the next deployment or within 60 seconds via ISR."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 194,
            columnNumber: 10
        }, this);
        $[7] = t4;
        $[8] = t5;
    } else {
        t4 = $[7];
        t5 = $[8];
    }
    let t6;
    if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = ({
            "ProductPageTab[<Toggle>.onChange]": (v)=>set("pdp_show_trust_strip", v)
        })["ProductPageTab[<Toggle>.onChange]"];
        $[9] = t6;
    } else {
        t6 = $[9];
    }
    let t7;
    if ($[10] !== settings.pdp_show_trust_strip) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
            checked: settings.pdp_show_trust_strip,
            onChange: t6,
            label: "Trust Strip",
            description: "Free Delivery / Easy Returns / Secure Payment icons below the CTA buttons."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 212,
            columnNumber: 10
        }, this);
        $[10] = settings.pdp_show_trust_strip;
        $[11] = t7;
    } else {
        t7 = $[11];
    }
    let t8;
    if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = ({
            "ProductPageTab[<Toggle>.onChange]": (v_0)=>set("pdp_show_product_details", v_0)
        })["ProductPageTab[<Toggle>.onChange]"];
        $[12] = t8;
    } else {
        t8 = $[12];
    }
    let t9;
    if ($[13] !== settings.pdp_show_product_details) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
            checked: settings.pdp_show_product_details,
            onChange: t8,
            label: "Product Details accordion",
            description: "Expandable section showing the product description and features list."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 229,
            columnNumber: 10
        }, this);
        $[13] = settings.pdp_show_product_details;
        $[14] = t9;
    } else {
        t9 = $[14];
    }
    let t10;
    if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
        t10 = ({
            "ProductPageTab[<Toggle>.onChange]": (v_1)=>set("pdp_show_care_instructions", v_1)
        })["ProductPageTab[<Toggle>.onChange]"];
        $[15] = t10;
    } else {
        t10 = $[15];
    }
    let t11;
    if ($[16] !== settings.pdp_show_care_instructions) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
            checked: settings.pdp_show_care_instructions,
            onChange: t10,
            label: "Care Instructions accordion",
            description: "Expandable section with washing and care guidance."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 246,
            columnNumber: 11
        }, this);
        $[16] = settings.pdp_show_care_instructions;
        $[17] = t11;
    } else {
        t11 = $[17];
    }
    let t12;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = ({
            "ProductPageTab[<Toggle>.onChange]": (v_2)=>set("pdp_show_delivery_returns", v_2)
        })["ProductPageTab[<Toggle>.onChange]"];
        $[18] = t12;
    } else {
        t12 = $[18];
    }
    let t13;
    if ($[19] !== settings.pdp_show_delivery_returns) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
            checked: settings.pdp_show_delivery_returns,
            onChange: t12,
            label: "Delivery & Returns accordion",
            description: "Expandable section with delivery times, free-delivery threshold, and return policy."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 263,
            columnNumber: 11
        }, this);
        $[19] = settings.pdp_show_delivery_returns;
        $[20] = t13;
    } else {
        t13 = $[20];
    }
    let t14;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t14 = ({
            "ProductPageTab[<Toggle>.onChange]": (v_3)=>set("pdp_show_reviews", v_3)
        })["ProductPageTab[<Toggle>.onChange]"];
        $[21] = t14;
    } else {
        t14 = $[21];
    }
    let t15;
    if ($[22] !== settings.pdp_show_reviews) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
            checked: settings.pdp_show_reviews,
            onChange: t14,
            label: "Customer Reviews section",
            description: "Rating summary bars and review cards at the bottom of the page."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 280,
            columnNumber: 11
        }, this);
        $[22] = settings.pdp_show_reviews;
        $[23] = t15;
    } else {
        t15 = $[23];
    }
    let t16;
    if ($[24] !== t11 || $[25] !== t13 || $[26] !== t15 || $[27] !== t7 || $[28] !== t9) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t4,
                t5,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white border border-neutral-200 rounded-lg px-4",
                    children: [
                        t7,
                        t9,
                        t11,
                        t13,
                        t15
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                    lineNumber: 288,
                    columnNumber: 24
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 288,
            columnNumber: 11
        }, this);
        $[24] = t11;
        $[25] = t13;
        $[26] = t15;
        $[27] = t7;
        $[28] = t9;
        $[29] = t16;
    } else {
        t16 = $[29];
    }
    const t17 = saving ? "Saving\u2026" : "Save Settings";
    let t18;
    if ($[30] !== save || $[31] !== saving || $[32] !== t17) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            onClick: save,
            disabled: saving,
            className: "px-5 py-2 bg-black text-white text-xs font-semibold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
            children: t17
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 301,
            columnNumber: 11
        }, this);
        $[30] = save;
        $[31] = saving;
        $[32] = t17;
        $[33] = t18;
    } else {
        t18 = $[33];
    }
    let t19;
    if ($[34] !== t16 || $[35] !== t18) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-8",
            children: [
                t16,
                t18
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
            lineNumber: 311,
            columnNumber: 11
        }, this);
        $[34] = t16;
        $[35] = t18;
        $[36] = t19;
    } else {
        t19 = $[36];
    }
    return t19;
}
_s(ProductPageTab, "EjEoObG9cKWDJIANlVpqzC0aR90=");
_c1 = ProductPageTab;
var _c, _c1;
__turbopack_context__.k.register(_c, "Toggle");
__turbopack_context__.k.register(_c1, "ProductPageTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(dashboard)/settings/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SettingsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/ImageUploader.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TagInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/TagInput.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$EmailsTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/EmailsTab.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$NotificationsTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/NotificationsTab.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$RidersTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/RidersTab.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$SizeGuideTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$TeamTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/TeamTab.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$BusinessSettingsTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$ShippingTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/ShippingTab.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$ProductPageTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/ProductPageTab.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const DEFAULT_BUSINESS = {
    business_name: "Miss Tokyo",
    email: "",
    contact: "",
    address: "",
    logo_url: null,
    tax_rate: 0
};
const DEFAULT_STORE = {
    global_sizes: [
        "39",
        "40",
        "41",
        "42",
        "43",
        "44",
        "45"
    ],
    global_colors: [
        "Noir",
        "Cognac",
        "Sand"
    ],
    global_stitching: [
        "Tonal",
        "Contrast White"
    ],
    enable_store_pickup: false,
    maintenance_mode: false,
    home_grid_cols: 4,
    shop_grid_cols: 4,
    shop_mobile_cols: 2,
    home_product_limit: 4,
    shop_product_limit: 12,
    shop_show_title: true,
    shop_image_stretch: false,
    platform_fee_percentage: 0,
    platform_fee_label: "Service Charge",
    show_fee_at_checkout: false,
    enable_gift_cards: true,
    enable_gallery: true,
    enable_craft: true,
    enable_whitelabel: true,
    enable_custom_requests: true,
    homepage_route: "home",
    wholesale_enabled: false,
    wholesale_tier_1_min: 3,
    wholesale_tier_1_max: 5,
    wholesale_tier_2_min: 8,
    wholesale_tier_2_max: 10,
    wholesale_tier_3_min: 12,
    wholesale_tier_3_max: 24
};
function SettingsPage() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(39);
    if ($[0] !== "a357ead7613311db256cb6c5d4691d78d862f2c86031f192b99022e07efe2223") {
        for(let $i = 0; $i < 39; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "a357ead7613311db256cb6c5d4691d78d862f2c86031f192b99022e07efe2223";
    }
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("business");
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = [
            {
                key: "business",
                label: "Business"
            },
            {
                key: "store",
                label: "Store"
            },
            {
                key: "shipping",
                label: "Shipping"
            },
            {
                key: "seo",
                label: "SEO"
            },
            {
                key: "product-page",
                label: "Product Page"
            },
            {
                key: "emails",
                label: "Emails"
            },
            {
                key: "notifications",
                label: "Notifications"
            },
            {
                key: "riders",
                label: "Riders"
            },
            {
                key: "size-guide",
                label: "Size Guide"
            },
            {
                key: "team",
                label: "Team"
            }
        ];
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    const tabs = t0;
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
            className: "mb-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-[20px] font-medium text-neutral-900 tracking-tight font-serif uppercase tracking-widest",
                    children: "Settings"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 152,
                    columnNumber: 35
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs text-neutral-500 mt-1 uppercase tracking-wider",
                    children: "Business details, store configuration, and operations."
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 152,
                    columnNumber: 157
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 152,
            columnNumber: 10
        }, this);
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    let t2;
    if ($[3] !== activeTab) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex overflow-x-auto border-b border-neutral-200 hide-scrollbar mb-8",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "flex gap-8",
                children: tabs.map({
                    "SettingsPage[tabs.map()]": (tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: {
                                "SettingsPage[tabs.map() > <button>.onClick]": ()=>setActiveTab(tab.key)
                            }["SettingsPage[tabs.map() > <button>.onClick]"],
                            className: `whitespace-nowrap pb-4 px-1 border-b-2 text-xs uppercase tracking-widest font-semibold transition-all ${activeTab === tab.key ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-neutral-600"}`,
                            children: tab.label
                        }, tab.key, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 160,
                            columnNumber: 46
                        }, this)
                }["SettingsPage[tabs.map()]"])
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 159,
                columnNumber: 96
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 159,
            columnNumber: 10
        }, this);
        $[3] = activeTab;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    let t3;
    if ($[5] !== activeTab) {
        t3 = activeTab === "business" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BusinessTab, {}, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 171,
                    columnNumber: 40
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-8",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$BusinessSettingsTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BusinessSettingsTab"], {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 171,
                        columnNumber: 77
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 171,
                    columnNumber: 55
                }, this)
            ]
        }, void 0, true);
        $[5] = activeTab;
        $[6] = t3;
    } else {
        t3 = $[6];
    }
    let t4;
    if ($[7] !== activeTab) {
        t4 = activeTab === "store" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StoreTab, {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 179,
            columnNumber: 35
        }, this);
        $[7] = activeTab;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    let t5;
    if ($[9] !== activeTab) {
        t5 = activeTab === "shipping" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$ShippingTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShippingTab"], {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 187,
            columnNumber: 38
        }, this);
        $[9] = activeTab;
        $[10] = t5;
    } else {
        t5 = $[10];
    }
    let t6;
    if ($[11] !== activeTab) {
        t6 = activeTab === "seo" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SEOTab, {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 195,
            columnNumber: 33
        }, this);
        $[11] = activeTab;
        $[12] = t6;
    } else {
        t6 = $[12];
    }
    let t7;
    if ($[13] !== activeTab) {
        t7 = activeTab === "emails" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$EmailsTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmailsTab"], {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 203,
            columnNumber: 36
        }, this);
        $[13] = activeTab;
        $[14] = t7;
    } else {
        t7 = $[14];
    }
    let t8;
    if ($[15] !== activeTab) {
        t8 = activeTab === "notifications" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$NotificationsTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationsTab"], {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 211,
            columnNumber: 43
        }, this);
        $[15] = activeTab;
        $[16] = t8;
    } else {
        t8 = $[16];
    }
    let t9;
    if ($[17] !== activeTab) {
        t9 = activeTab === "riders" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$RidersTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RidersTab"], {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 219,
            columnNumber: 36
        }, this);
        $[17] = activeTab;
        $[18] = t9;
    } else {
        t9 = $[18];
    }
    let t10;
    if ($[19] !== activeTab) {
        t10 = activeTab === "size-guide" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$SizeGuideTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SizeGuideTab"], {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 227,
            columnNumber: 41
        }, this);
        $[19] = activeTab;
        $[20] = t10;
    } else {
        t10 = $[20];
    }
    let t11;
    if ($[21] !== activeTab) {
        t11 = activeTab === "team" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$TeamTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TeamTab"], {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 235,
            columnNumber: 35
        }, this);
        $[21] = activeTab;
        $[22] = t11;
    } else {
        t11 = $[22];
    }
    let t12;
    if ($[23] !== activeTab) {
        t12 = activeTab === "product-page" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$ProductPageTab$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProductPageTab"], {}, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 243,
            columnNumber: 43
        }, this);
        $[23] = activeTab;
        $[24] = t12;
    } else {
        t12 = $[24];
    }
    let t13;
    if ($[25] !== t10 || $[26] !== t11 || $[27] !== t12 || $[28] !== t3 || $[29] !== t4 || $[30] !== t5 || $[31] !== t6 || $[32] !== t7 || $[33] !== t8 || $[34] !== t9) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-full",
            children: [
                t3,
                t4,
                t5,
                t6,
                t7,
                t8,
                t9,
                t10,
                t11,
                t12
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 251,
            columnNumber: 11
        }, this);
        $[25] = t10;
        $[26] = t11;
        $[27] = t12;
        $[28] = t3;
        $[29] = t4;
        $[30] = t5;
        $[31] = t6;
        $[32] = t7;
        $[33] = t8;
        $[34] = t9;
        $[35] = t13;
    } else {
        t13 = $[35];
    }
    let t14;
    if ($[36] !== t13 || $[37] !== t2) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto px-4",
            children: [
                t1,
                t2,
                t13
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 268,
            columnNumber: 11
        }, this);
        $[36] = t13;
        $[37] = t2;
        $[38] = t14;
    } else {
        t14 = $[38];
    }
    return t14;
}
_s(SettingsPage, "QfB/3oOLeg2iDDSJMe/X4eACnt0=");
_c = SettingsPage;
function BusinessTab() {
    _s1();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(53);
    if ($[0] !== "a357ead7613311db256cb6c5d4691d78d862f2c86031f192b99022e07efe2223") {
        for(let $i = 0; $i < 53; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "a357ead7613311db256cb6c5d4691d78d862f2c86031f192b99022e07efe2223";
    }
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_BUSINESS);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    let t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = ({
            "BusinessTab[useEffect()]": ()=>{
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("business_settings").select("*").eq("id", "default").single().then({
                    "BusinessTab[useEffect() > (anonymous)()]": (t2)=>{
                        const { data: bData } = t2;
                        setForm({
                            business_name: bData?.business_name || "",
                            email: bData?.email || "",
                            contact: bData?.contact || "",
                            address: bData?.address || "",
                            logo_url: bData?.logo_url || null,
                            tax_rate: Number(bData?.tax_rate) || 0
                        });
                        setLoading(false);
                    }
                }["BusinessTab[useEffect() > (anonymous)()]"]);
            }
        })["BusinessTab[useEffect()]"];
        t1 = [];
        $[1] = t0;
        $[2] = t1;
    } else {
        t0 = $[1];
        t1 = $[2];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "BusinessTab[handleChange]": (e)=>{
                setForm({
                    "BusinessTab[handleChange > setForm()]": (prev)=>({
                            ...prev,
                            [e.target.name]: e.target.value
                        })
                }["BusinessTab[handleChange > setForm()]"]);
            }
        })["BusinessTab[handleChange]"];
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    const handleChange = t2;
    let t3;
    if ($[4] !== form) {
        t3 = ({
            "BusinessTab[handleSave]": async (e_0)=>{
                e_0.preventDefault();
                setSaving(true);
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("business_settings").upsert({
                    id: "default",
                    ...form,
                    tax_rate: Number(form.tax_rate),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: "id"
                });
                setSaving(false);
                setSaved(true);
                setTimeout({
                    "BusinessTab[handleSave > setTimeout()]": ()=>setSaved(false)
                }["BusinessTab[handleSave > setTimeout()]"], 3000);
            }
        })["BusinessTab[handleSave]"];
        $[4] = form;
        $[5] = t3;
    } else {
        t3 = $[5];
    }
    const handleSave = t3;
    if (loading) {
        let t4;
        if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
            t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-neutral-400 italic font-serif",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 367,
                columnNumber: 12
            }, this);
            $[6] = t4;
        } else {
            t4 = $[6];
        }
        return t4;
    }
    let t4;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
            children: "Brand"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 376,
            columnNumber: 10
        }, this);
        $[7] = t4;
    } else {
        t4 = $[7];
    }
    let t5;
    if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = ({
            "BusinessTab[<ImageUploader>.onUpload]": (url)=>setForm({
                    "BusinessTab[<ImageUploader>.onUpload > setForm()]": (p)=>({
                            ...p,
                            logo_url: url
                        })
                }["BusinessTab[<ImageUploader>.onUpload > setForm()]"])
        })["BusinessTab[<ImageUploader>.onUpload]"];
        $[8] = t5;
    } else {
        t5 = $[8];
    }
    let t6;
    if ($[9] !== form.logo_url) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ImageUploader"], {
            bucket: "site-assets",
            folder: "logos",
            currentUrl: form.logo_url,
            onUpload: t5,
            aspectRatio: "square",
            label: "Business Logo"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 397,
            columnNumber: 10
        }, this);
        $[9] = form.logo_url;
        $[10] = t6;
    } else {
        t6 = $[10];
    }
    let t7;
    if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: "Tax Rate (%)"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 405,
            columnNumber: 10
        }, this);
        $[11] = t7;
    } else {
        t7 = $[11];
    }
    let t8;
    if ($[12] !== form.tax_rate) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "number",
            name: "tax_rate",
            min: "0",
            max: "100",
            step: "0.1",
            value: form.tax_rate,
            onChange: handleChange,
            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
            placeholder: "0"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 412,
            columnNumber: 10
        }, this);
        $[12] = form.tax_rate;
        $[13] = t8;
    } else {
        t8 = $[13];
    }
    let t9;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 mt-1 tracking-wider uppercase",
            children: "Applied to taxable order totals."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 420,
            columnNumber: 10
        }, this);
        $[14] = t9;
    } else {
        t9 = $[14];
    }
    let t10;
    if ($[15] !== t8) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t7,
                t8,
                t9
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 427,
            columnNumber: 11
        }, this);
        $[15] = t8;
        $[16] = t10;
    } else {
        t10 = $[16];
    }
    let t11;
    if ($[17] !== t10 || $[18] !== t6) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border border-neutral-200 p-8 space-y-6",
            children: [
                t4,
                t6,
                t10
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 435,
            columnNumber: 11
        }, this);
        $[17] = t10;
        $[18] = t6;
        $[19] = t11;
    } else {
        t11 = $[19];
    }
    let t12;
    let t13;
    if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
            children: "Business Details"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 445,
            columnNumber: 11
        }, this);
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: "Business Name"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 446,
            columnNumber: 11
        }, this);
        $[20] = t12;
        $[21] = t13;
    } else {
        t12 = $[20];
        t13 = $[21];
    }
    let t14;
    if ($[22] !== form.business_name) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t13,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    name: "business_name",
                    required: true,
                    value: form.business_name,
                    onChange: handleChange,
                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                    placeholder: "Miss Tokyo"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 455,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 455,
            columnNumber: 11
        }, this);
        $[22] = form.business_name;
        $[23] = t14;
    } else {
        t14 = $[23];
    }
    let t15;
    if ($[24] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: "Business Email"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 463,
            columnNumber: 11
        }, this);
        $[24] = t15;
    } else {
        t15 = $[24];
    }
    let t16;
    if ($[25] !== form.email) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t15,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "email",
                    name: "email",
                    value: form.email,
                    onChange: handleChange,
                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                    placeholder: "hello@misstokyo.shop"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 470,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 470,
            columnNumber: 11
        }, this);
        $[25] = form.email;
        $[26] = t16;
    } else {
        t16 = $[26];
    }
    let t17;
    if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: "Contact / Phone"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 478,
            columnNumber: 11
        }, this);
        $[27] = t17;
    } else {
        t17 = $[27];
    }
    let t18;
    if ($[28] !== form.contact) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t17,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    name: "contact",
                    value: form.contact,
                    onChange: handleChange,
                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                    placeholder: "+233 ..."
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 485,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 485,
            columnNumber: 11
        }, this);
        $[28] = form.contact;
        $[29] = t18;
    } else {
        t18 = $[29];
    }
    let t19;
    if ($[30] === Symbol.for("react.memo_cache_sentinel")) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
            children: "Business Address"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 493,
            columnNumber: 11
        }, this);
        $[30] = t19;
    } else {
        t19 = $[30];
    }
    let t20;
    if ($[31] !== form.address) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t19,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    name: "address",
                    rows: 2,
                    value: form.address,
                    onChange: handleChange,
                    className: "w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black transition-colors resize-none text-sm",
                    placeholder: "123 Main Street, Accra, Ghana"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 500,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 500,
            columnNumber: 11
        }, this);
        $[31] = form.address;
        $[32] = t20;
    } else {
        t20 = $[32];
    }
    let t21;
    if ($[33] !== saved) {
        t21 = saved && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-xs text-green-600 tracking-wider uppercase",
            children: "Saved"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 508,
            columnNumber: 20
        }, this);
        $[33] = saved;
        $[34] = t21;
    } else {
        t21 = $[34];
    }
    const t22 = saving ? "Saving..." : "Save Settings";
    let t23;
    if ($[35] !== saving || $[36] !== t22) {
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "submit",
            disabled: saving,
            className: "px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
            children: t22
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 517,
            columnNumber: 11
        }, this);
        $[35] = saving;
        $[36] = t22;
        $[37] = t23;
    } else {
        t23 = $[37];
    }
    let t24;
    if ($[38] !== t21 || $[39] !== t23) {
        t24 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-end items-center gap-6 pt-2",
            children: [
                t21,
                t23
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 526,
            columnNumber: 11
        }, this);
        $[38] = t21;
        $[39] = t23;
        $[40] = t24;
    } else {
        t24 = $[40];
    }
    let t25;
    if ($[41] !== t14 || $[42] !== t16 || $[43] !== t18 || $[44] !== t20 || $[45] !== t24) {
        t25 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border border-neutral-200 p-8 space-y-6",
            children: [
                t12,
                t14,
                t16,
                t18,
                t20,
                t24
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 535,
            columnNumber: 11
        }, this);
        $[41] = t14;
        $[42] = t16;
        $[43] = t18;
        $[44] = t20;
        $[45] = t24;
        $[46] = t25;
    } else {
        t25 = $[46];
    }
    let t26;
    if ($[47] !== t11 || $[48] !== t25) {
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start",
            children: [
                t11,
                t25
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 547,
            columnNumber: 11
        }, this);
        $[47] = t11;
        $[48] = t25;
        $[49] = t26;
    } else {
        t26 = $[49];
    }
    let t27;
    if ($[50] !== handleSave || $[51] !== t26) {
        t27 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: handleSave,
            className: "space-y-8",
            children: t26
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 556,
            columnNumber: 11
        }, this);
        $[50] = handleSave;
        $[51] = t26;
        $[52] = t27;
    } else {
        t27 = $[52];
    }
    return t27;
}
_s1(BusinessTab, "4g7ESw3DtDGgHekMsVPcppOh+W8=");
_c1 = BusinessTab;
function StoreTab() {
    _s2();
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_STORE);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [allCategories, setAllCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [wholesaleCatIds, setWholesaleCatIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StoreTab.useEffect": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("store_settings").select("*").eq("id", "default").single().then({
                "StoreTab.useEffect": ({ data: sData })=>{
                    if (sData) {
                        setForm({
                            global_sizes: sData.global_sizes || DEFAULT_STORE.global_sizes,
                            global_colors: sData.global_colors || DEFAULT_STORE.global_colors,
                            global_stitching: sData.global_stitching || DEFAULT_STORE.global_stitching,
                            enable_store_pickup: sData.enable_store_pickup || false,
                            maintenance_mode: sData.maintenance_mode || false,
                            home_grid_cols: sData.home_grid_cols || 4,
                            shop_grid_cols: sData.shop_grid_cols || 4,
                            shop_mobile_cols: sData.shop_mobile_cols || 2,
                            home_product_limit: sData.home_product_limit || 4,
                            shop_product_limit: sData.shop_product_limit || 12,
                            shop_show_title: sData.shop_show_title ?? true,
                            shop_image_stretch: sData.shop_image_stretch ?? false,
                            platform_fee_percentage: Number(sData.platform_fee_percentage) ?? 0,
                            platform_fee_label: sData.platform_fee_label || "Service Charge",
                            show_fee_at_checkout: sData.show_fee_at_checkout ?? false,
                            enable_gift_cards: sData.enable_gift_cards ?? true,
                            enable_gallery: sData.enable_gallery ?? true,
                            enable_craft: sData.enable_craft ?? true,
                            enable_whitelabel: sData.enable_whitelabel ?? true,
                            enable_custom_requests: sData.enable_custom_requests ?? true,
                            homepage_route: sData.homepage_route ?? "home",
                            wholesale_enabled: sData.wholesale_enabled ?? false,
                            wholesale_tier_1_min: sData.wholesale_tier_1_min ?? 3,
                            wholesale_tier_1_max: sData.wholesale_tier_1_max ?? 5,
                            wholesale_tier_2_min: sData.wholesale_tier_2_min ?? 8,
                            wholesale_tier_2_max: sData.wholesale_tier_2_max ?? 10,
                            wholesale_tier_3_min: sData.wholesale_tier_3_min ?? 12,
                            wholesale_tier_3_max: sData.wholesale_tier_3_max ?? 24
                        });
                    }
                    setLoading(false);
                }
            }["StoreTab.useEffect"]);
            // Fetch all active categories to allow selection
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("categories").select("id, name, is_wholesale").eq("is_active", true).order("name").then({
                "StoreTab.useEffect": ({ data: catData })=>{
                    if (catData) {
                        setAllCategories(catData);
                        setWholesaleCatIds(new Set(catData.filter({
                            "StoreTab.useEffect": (c)=>c.is_wholesale
                        }["StoreTab.useEffect"]).map({
                            "StoreTab.useEffect": (c_0)=>c_0.id
                        }["StoreTab.useEffect"])));
                    }
                }
            }["StoreTab.useEffect"]);
        }
    }["StoreTab.useEffect"], []);
    const handleSave = async (e)=>{
        e.preventDefault();
        setSaving(true);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("store_settings").upsert({
            id: "default",
            ...form
        }, {
            onConflict: "id"
        });
        // Update categories wholesale status
        for (const cat of allCategories){
            const isWholesale = wholesaleCatIds.has(cat.id);
            if (isWholesale !== cat.is_wholesale) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("categories").update({
                    is_wholesale: isWholesale
                }).eq("id", cat.id);
            }
        }
        setSaving(false);
        setSaved(true);
        setTimeout(()=>setSaved(false), 3000);
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-neutral-400 italic font-serif",
            children: "Loading..."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 653,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                onSubmit: handleSave,
                className: "space-y-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-8",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white border border-neutral-200 p-8 space-y-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                            children: "Store Configuration"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 662,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-3 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: form.enable_store_pickup,
                                                            onChange: (e_0)=>setForm((p)=>({
                                                                        ...p,
                                                                        enable_store_pickup: e_0.target.checked
                                                                    })),
                                                            className: "w-4 h-4 accent-black"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 666,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                            children: "Enable Store Pickup"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 670,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 665,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                                    children: "Allow customers to pick up orders directly from the atelier."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 672,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 664,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-4 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-3 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: form.maintenance_mode,
                                                            onChange: (e_1)=>setForm((p_0)=>({
                                                                        ...p_0,
                                                                        maintenance_mode: e_1.target.checked
                                                                    })),
                                                            className: "w-4 h-4 accent-black"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 677,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                            children: "Enable Coming Soon / Maintenance Mode"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 681,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 676,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                                    children: "Restrict access to the shop and show a coming soon placeholder."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 683,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 675,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-4 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                    children: "Default Landing Page"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 687,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 tracking-wider uppercase mb-3",
                                                    children: "Choose which page customers land on when they visit the site root (/)."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 688,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex gap-3",
                                                    children: [
                                                        {
                                                            value: "home",
                                                            label: "Home"
                                                        },
                                                        {
                                                            value: "shop",
                                                            label: "Shop"
                                                        },
                                                        {
                                                            value: "gallery",
                                                            label: "Gallery"
                                                        }
                                                    ].map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setForm((p_1)=>({
                                                                        ...p_1,
                                                                        homepage_route: opt.value
                                                                    })),
                                                            className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.homepage_route === opt.value ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                            children: opt.label
                                                        }, opt.value, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 699,
                                                            columnNumber: 41
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 689,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 686,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-4 border-t border-neutral-100 mt-6 grid grid-cols-1 gap-6",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                            children: "Global Shoe Sizes"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 710,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TagInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TagInput"], {
                                                            value: form.global_sizes,
                                                            onChange: (tags)=>setForm((p_2)=>({
                                                                        ...p_2,
                                                                        global_sizes: tags
                                                                    })),
                                                            placeholder: "Type a size and press Enter…"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 711,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Press Enter or , to add each size."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 715,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 709,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                            children: "Global Colors"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 719,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TagInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TagInput"], {
                                                            value: form.global_colors,
                                                            onChange: (tags_0)=>setForm((p_3)=>({
                                                                        ...p_3,
                                                                        global_colors: tags_0
                                                                    })),
                                                            placeholder: "Type a color and press Enter…"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 720,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Press Enter or , to add each color."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 724,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 718,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 708,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 661,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 659,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-8",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white border border-neutral-200 p-8 space-y-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                            children: "Visual Merchandising"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 744,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                            children: "Control the product columns on desktop and how many items appear in the homepage featured grid. Mobile stays 2-column, tablet stays 2-column."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 745,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 md:grid-cols-2 gap-8",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                            children: "Homepage Grid Columns"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 751,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex gap-3",
                                                            children: [
                                                                2,
                                                                3,
                                                                4,
                                                                5
                                                            ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    onClick: ()=>setForm((p_4)=>({
                                                                                ...p_4,
                                                                                home_grid_cols: n
                                                                            })),
                                                                    className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.home_grid_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                                    children: n
                                                                }, n, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                    lineNumber: 753,
                                                                    columnNumber: 75
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 752,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Columns on the homepage collection grid."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 760,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 750,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                            children: "Shop Page Grid Columns"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 764,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex gap-3",
                                                            children: [
                                                                2,
                                                                3,
                                                                4,
                                                                5
                                                            ].map((n_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    onClick: ()=>setForm((p_5)=>({
                                                                                ...p_5,
                                                                                shop_grid_cols: n_0
                                                                            })),
                                                                    className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_grid_cols === n_0 ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                                    children: n_0
                                                                }, n_0, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                    lineNumber: 766,
                                                                    columnNumber: 77
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 765,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Columns on the full shop listing grid."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 773,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 763,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                            children: "Shop Page Mobile Columns"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 777,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex gap-3 max-w-[160px]",
                                                            children: [
                                                                1,
                                                                2
                                                            ].map((n_1)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    onClick: ()=>setForm((p_6)=>({
                                                                                ...p_6,
                                                                                shop_mobile_cols: n_1
                                                                            })),
                                                                    className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_mobile_cols === n_1 ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                                    children: n_1
                                                                }, n_1, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                    lineNumber: 779,
                                                                    columnNumber: 71
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 778,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Grid columns on mobile devices."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 786,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 776,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 749,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-6 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                    children: "Featured Products on Homepage"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 791,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex gap-3 max-w-xs",
                                                    children: [
                                                        4,
                                                        6,
                                                        8,
                                                        12
                                                    ].map((n_2)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setForm((p_7)=>({
                                                                        ...p_7,
                                                                        home_product_limit: n_2
                                                                    })),
                                                            className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.home_product_limit === n_2 ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                            children: n_2
                                                        }, n_2, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 793,
                                                            columnNumber: 74
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 792,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                    children: "Number of products shown in the homepage collection grid."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 800,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 790,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-6 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                    children: "Shop Page — Products Per Page"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 804,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex gap-3 max-w-sm",
                                                    children: [
                                                        8,
                                                        12,
                                                        16,
                                                        24,
                                                        32
                                                    ].map((n_3)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setForm((p_8)=>({
                                                                        ...p_8,
                                                                        shop_product_limit: n_3
                                                                    })),
                                                            className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_product_limit === n_3 ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                            children: n_3
                                                        }, n_3, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 806,
                                                            columnNumber: 80
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 805,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                    children: "Total products loaded per page on the shop listing."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 813,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 803,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-6 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-3 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: form.shop_show_title,
                                                            onChange: (e_2)=>setForm((p_9)=>({
                                                                        ...p_9,
                                                                        shop_show_title: e_2.target.checked
                                                                    })),
                                                            className: "w-4 h-4 accent-black"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 818,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                            children: "Show Shop Page Title & Subtitle"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 822,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 817,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                                    children: "Display the hero text header above the product grid on the shop page."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 824,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 816,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-6 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-3 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: form.shop_image_stretch,
                                                            onChange: (e_3)=>setForm((p_10)=>({
                                                                        ...p_10,
                                                                        shop_image_stretch: e_3.target.checked
                                                                    })),
                                                            className: "w-4 h-4 accent-black"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 829,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                            children: "Stretch Product Images to Fill Frame"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 833,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 828,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                                    children: "When on, images fill the card exactly (may distort). When off, images are cropped to fit."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 835,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 827,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 743,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 741,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 657,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border border-neutral-200 p-8 space-y-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                children: "Platform Fees"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 844,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                children: "A percentage-based fee applied to all orders, invoices, and payment links to offset processing charges."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 845,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                children: "Fee Percentage (%)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 851,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                min: "0",
                                                max: "100",
                                                step: "0.1",
                                                value: form.platform_fee_percentage,
                                                onChange: (e_4)=>setForm((p_11)=>({
                                                            ...p_11,
                                                            platform_fee_percentage: parseFloat(e_4.target.value) || 0
                                                        })),
                                                className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                                placeholder: "2.5"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 852,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                children: "e.g. 2.5 adds 2.5% to every order total."
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 856,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 850,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                children: "Fee Label"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 859,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                value: form.platform_fee_label,
                                                onChange: (e_5)=>setForm((p_12)=>({
                                                            ...p_12,
                                                            platform_fee_label: e_5.target.value
                                                        })),
                                                className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                                placeholder: "Service Charge"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 860,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                children: "Label shown to customers on receipts."
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 864,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 858,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 849,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-4 border-t border-neutral-100",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "flex items-center gap-3 cursor-pointer",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                checked: form.show_fee_at_checkout,
                                                onChange: (e_6)=>setForm((p_13)=>({
                                                            ...p_13,
                                                            show_fee_at_checkout: e_6.target.checked
                                                        })),
                                                className: "w-4 h-4 accent-black"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 870,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                children: "Show Fee as Itemised Line at Checkout"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 874,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 869,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                        children: 'When off, the fee is silently rolled into "Shipping & Handling" so the total still adds up without a visible surcharge line.'
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 876,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 868,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 843,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border border-neutral-200 p-8 space-y-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                children: "Feature Toggles"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 884,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                children: "Enable or disable storefront sections. Hidden sections are removed from the navigation."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 885,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8",
                                children: [
                                    {
                                        key: "enable_gift_cards",
                                        label: "Gift Cards",
                                        desc: "Show the gift card purchase page in the navbar."
                                    },
                                    {
                                        key: "enable_gallery",
                                        label: "Gallery",
                                        desc: "Show the gallery page and nav link."
                                    },
                                    {
                                        key: "enable_craft",
                                        label: "The Craft",
                                        desc: "Show the craft / process page in the navbar."
                                    },
                                    {
                                        key: "enable_whitelabel",
                                        label: "White Labelling",
                                        desc: "Show the white labelling / custom order page."
                                    },
                                    {
                                        key: "enable_custom_requests",
                                        label: "Custom Requests",
                                        desc: "Enable the custom order request form and admin submissions inbox."
                                    }
                                ].map(({ key, label, desc })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "py-4 border-b border-neutral-100 last:border-b-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center gap-3 cursor-pointer",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        checked: form[key],
                                                        onChange: (e_7)=>setForm((p_14)=>({
                                                                    ...p_14,
                                                                    [key]: e_7.target.checked
                                                                })),
                                                        className: "w-4 h-4 accent-black"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 914,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                        children: label
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 918,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 913,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-neutral-400 mt-1 tracking-wider uppercase ml-7",
                                                children: desc
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 920,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, key, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 912,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 887,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 883,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border border-neutral-200 p-8 space-y-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                        children: "Wholesale / B2B Configuration"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 928,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 tracking-wider uppercase mt-4",
                                        children: "Enable B2B wholesale pricing with quantity-based tiers. Wholesale users see custom pricing instead of retail prices on the storefront."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 929,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 927,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "flex items-center gap-3 cursor-pointer",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                checked: form.wholesale_enabled,
                                                onChange: (e_8)=>setForm((p_15)=>({
                                                            ...p_15,
                                                            wholesale_enabled: e_8.target.checked
                                                        })),
                                                className: "w-4 h-4 accent-black"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 936,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                children: "Enable Global Tier-Based Pricing"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 940,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 935,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 mt-1 tracking-wider uppercase ml-7",
                                        children: "When on, users with the Wholesale role see tier-based pricing on product pages."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 942,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 934,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-6 border-t border-neutral-100 space-y-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-[10px] uppercase tracking-[0.1em] font-bold text-black",
                                                children: "Wholesale Exclusive Categories"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 949,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[9px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded",
                                                children: "Access Protection"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 950,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 948,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                        children: "Toggle categories that should be restricted to wholesale users only. Products assigned ONLY to these will be hidden from retail customers."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 952,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 sm:grid-cols-3 gap-2",
                                        children: allCategories.map((cat_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>{
                                                    const next = new Set(wholesaleCatIds);
                                                    if (next.has(cat_0.id)) next.delete(cat_0.id);
                                                    else next.add(cat_0.id);
                                                    setWholesaleCatIds(next);
                                                },
                                                className: `flex items-center gap-3 px-3 py-2.5 border text-[9px] font-bold uppercase tracking-widest transition-all ${wholesaleCatIds.has(cat_0.id) ? "bg-black text-white border-black" : "bg-white text-neutral-400 border-neutral-100 hover:border-neutral-200"}`,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `w-1.5 h-1.5 rounded-full ${wholesaleCatIds.has(cat_0.id) ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-neutral-100"}`
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 961,
                                                        columnNumber: 37
                                                    }, this),
                                                    cat_0.name
                                                ]
                                            }, cat_0.id, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 956,
                                                columnNumber: 57
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 955,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 947,
                                columnNumber: 21
                            }, this),
                            form.wholesale_enabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-6 border-t border-neutral-100 space-y-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                        children: "Define the quantity range for each pricing tier. These ranges apply globally across all products."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 968,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-1 md:grid-cols-3 gap-6",
                                        children: [
                                            1,
                                            2,
                                            3
                                        ].map((tier)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-4 p-5 border border-neutral-100 bg-neutral-50",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                        children: [
                                                            "Tier ",
                                                            tier
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 973,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "grid grid-cols-2 gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "block text-[9px] uppercase tracking-widest text-neutral-400 mb-1",
                                                                        children: "Min Qty"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                        lineNumber: 976,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "number",
                                                                        min: "1",
                                                                        value: form[`wholesale_tier_${tier}_min`],
                                                                        onChange: (e_9)=>setForm((p_16)=>({
                                                                                    ...p_16,
                                                                                    [`wholesale_tier_${tier}_min`]: parseInt(e_9.target.value) || 1
                                                                                })),
                                                                        className: "w-full border-b border-neutral-300 bg-transparent py-1.5 outline-none focus:border-black text-sm text-center transition-colors"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                        lineNumber: 977,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                lineNumber: 975,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "block text-[9px] uppercase tracking-widest text-neutral-400 mb-1",
                                                                        children: "Max Qty"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                        lineNumber: 983,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "number",
                                                                        min: "1",
                                                                        value: form[`wholesale_tier_${tier}_max`],
                                                                        onChange: (e_10)=>setForm((p_17)=>({
                                                                                    ...p_17,
                                                                                    [`wholesale_tier_${tier}_max`]: parseInt(e_10.target.value) || 1
                                                                                })),
                                                                        className: "w-full border-b border-neutral-300 bg-transparent py-1.5 outline-none focus:border-black text-sm text-center transition-colors"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                        lineNumber: 984,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                lineNumber: 982,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 974,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[9px] text-neutral-400 tracking-widest uppercase",
                                                        children: [
                                                            form[`wholesale_tier_${tier}_min`],
                                                            " – ",
                                                            form[`wholesale_tier_${tier}_max`],
                                                            " units"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 990,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, tier, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 972,
                                                columnNumber: 67
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 971,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 967,
                                columnNumber: 48
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 926,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-end items-center gap-6",
                        children: [
                            saved && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-green-600 tracking-wider uppercase",
                                children: "Saved successfully"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 999,
                                columnNumber: 31
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "submit",
                                disabled: saving,
                                className: "px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                                children: saving ? "Saving..." : "Save Store Settings"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 1000,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 998,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 656,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CarouselConfigSection, {}, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1005,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
_s2(StoreTab, "6p8jxT9vWWtUi3jCHbE9RibOJEo=");
_c2 = StoreTab;
const DEFAULT_CAROUSEL_TABS = [
    {
        label: "New In",
        mode: "newest",
        category_name: ""
    },
    {
        label: "Bestsellers",
        mode: "sort_order",
        category_name: ""
    }
];
function CarouselConfigSection() {
    _s3();
    const [categories, setCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tabs, setTabs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_CAROUSEL_TABS);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CarouselConfigSection.useEffect": ()=>{
            Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("categories").select("name, slug").eq("is_active", true).order("name"),
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_copy").select("value").eq("copy_key", "carousel_config").maybeSingle()
            ]).then({
                "CarouselConfigSection.useEffect": ([{ data: cats }, { data: config }])=>{
                    if (cats) setCategories(cats);
                    if (config?.value) {
                        try {
                            const parsed = JSON.parse(config.value);
                            if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) setTabs(parsed.tabs);
                        } catch  {}
                    }
                    setLoading(false);
                }
            }["CarouselConfigSection.useEffect"]);
        }
    }["CarouselConfigSection.useEffect"], []);
    const updateTab = (i, field, value)=>{
        setTabs((prev)=>prev.map((t, idx)=>idx === i ? {
                    ...t,
                    [field]: value
                } : t));
    };
    const handleSave = async ()=>{
        setSaving(true);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_copy").upsert({
            copy_key: "carousel_config",
            value: JSON.stringify({
                tabs
            })
        }, {
            onConflict: "copy_key"
        });
        setSaving(false);
        setSaved(true);
        setTimeout(()=>setSaved(false), 3000);
    };
    if (loading) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-white border border-neutral-200 p-8 space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-b border-neutral-100 pb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-xs font-semibold uppercase tracking-widest",
                        children: "Homepage Carousel Tabs"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 1070,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-neutral-400 mt-1 tracking-wider uppercase",
                        children: 'Configure the tabs on the "A Moment For New" carousel. Filter by category or show all products.'
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 1071,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1069,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-8",
                children: tabs.map((tab, i_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4 border border-neutral-100 p-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] font-semibold uppercase tracking-widest text-neutral-500",
                                children: [
                                    "Tab ",
                                    i_0 + 1
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 1078,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1",
                                        children: "Label"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 1081,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        value: tab.label,
                                        onChange: (e)=>updateTab(i_0, "label", e.target.value),
                                        className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                        placeholder: "e.g. New In"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 1082,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 1080,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1",
                                        children: "Sort Order"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 1086,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: tab.mode,
                                        onChange: (e_0)=>updateTab(i_0, "mode", e_0.target.value),
                                        className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "newest",
                                                children: "Newest First"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 1088,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "sort_order",
                                                children: "Admin Sort Order (Bestsellers)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 1089,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 1087,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 1085,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1",
                                        children: "Category Filter"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 1094,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: tab.category_name,
                                        onChange: (e_1)=>updateTab(i_0, "category_name", e_1.target.value),
                                        className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All Products"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 1096,
                                                columnNumber: 33
                                            }, this),
                                            categories.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: c.name,
                                                    children: c.name
                                                }, c.slug, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 1097,
                                                    columnNumber: 54
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 1095,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 1093,
                                columnNumber: 25
                            }, this)
                        ]
                    }, i_0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 1077,
                        columnNumber: 41
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1076,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-end items-center gap-6 pt-2",
                children: [
                    saved && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-xs text-green-600 tracking-wider uppercase",
                        children: "Saved"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 1104,
                        columnNumber: 27
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: handleSave,
                        disabled: saving,
                        className: "px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                        children: saving ? "Saving..." : "Save Carousel Config"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 1105,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1103,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
        lineNumber: 1068,
        columnNumber: 10
    }, this);
}
_s3(CarouselConfigSection, "FqFKZMJO4UWjK2A5CQb7JfWWpA8=");
_c3 = CarouselConfigSection;
function SEOTab() {
    _s4();
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [metadataList, setMetadataList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedPath, setSelectedPath] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("/");
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        page_path: "/",
        title: "",
        description: "",
        og_image_url: "",
        keywords: ""
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SEOTab.useEffect": ()=>{
            fetchMetadata();
        }
    }["SEOTab.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SEOTab.useEffect": ()=>{
            const existing = metadataList.find({
                "SEOTab.useEffect.existing": (m)=>m.page_path === selectedPath
            }["SEOTab.useEffect.existing"]);
            if (existing) {
                setFormData({
                    ...existing,
                    keywords: existing.keywords ?? "",
                    og_image_url: existing.og_image_url ?? "",
                    title: existing.title ?? "",
                    description: existing.description ?? ""
                });
            } else {
                setFormData({
                    page_path: selectedPath,
                    title: "",
                    description: "",
                    og_image_url: "",
                    keywords: ""
                });
            }
        }
    }["SEOTab.useEffect"], [
        selectedPath,
        metadataList
    ]);
    const fetchMetadata = async ()=>{
        setLoading(true);
        const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_metadata").select("*");
        if (data) setMetadataList(data);
        setLoading(false);
    };
    const handleChange = (e)=>{
        setFormData((prev)=>({
                ...prev,
                [e.target.name]: e.target.value
            }));
    };
    const handleSave = async (e_0)=>{
        e_0.preventDefault();
        setSaving(true);
        try {
            const { page_path, title, description, og_image_url, keywords } = formData;
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("site_metadata").upsert({
                page_path,
                title,
                description,
                og_image_url,
                keywords,
                updated_at: new Date().toISOString()
            }, {
                onConflict: "page_path"
            });
            await fetchMetadata();
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("SEO metadata saved.");
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to save SEO metadata.");
        } finally{
            setSaving(false);
        }
    };
    const titleLength = formData.title.length;
    const descriptionLength = formData.description.length;
    const titleColor = titleLength > 60 ? "text-red-500" : "text-neutral-500";
    const descColor = descriptionLength > 160 ? "text-red-500" : "text-neutral-500";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 lg:grid-cols-2 gap-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white p-8 border border-neutral-200",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSave,
                    className: "space-y-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "page_path",
                                    className: "block text-xs uppercase tracking-widest font-semibold mb-3",
                                    children: "Target Route"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1199,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    id: "page_path",
                                    value: selectedPath,
                                    onChange: (e_1)=>setSelectedPath(e_1.target.value),
                                    className: "w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors uppercase text-sm font-medium tracking-wide appearance-none",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "/",
                                            children: "Home (/)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1201,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "/shop",
                                            children: "Shop (/shop)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1202,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "/craft",
                                            children: "Craft (/craft)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1203,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "/custom",
                                            children: "Custom (/custom)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1204,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1200,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1198,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-end mb-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "title",
                                            className: "block text-xs uppercase tracking-widest font-semibold",
                                            children: "Meta Title"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1210,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: `text-[10px] tracking-widest ${titleColor}`,
                                            children: [
                                                titleLength,
                                                " / 60"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1211,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1209,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    id: "title",
                                    name: "title",
                                    value: formData.title,
                                    onChange: handleChange,
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none",
                                    placeholder: "Miss Tokyo | Handcrafted in Ghana"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1213,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1208,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-end mb-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "description",
                                            className: "block text-xs uppercase tracking-widest font-semibold",
                                            children: "Meta Description"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1218,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: `text-[10px] tracking-widest ${descColor}`,
                                            children: [
                                                descriptionLength,
                                                " / 160"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1219,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1217,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    id: "description",
                                    name: "description",
                                    rows: 4,
                                    value: formData.description,
                                    onChange: handleChange,
                                    className: "w-full border border-neutral-200 p-4 bg-transparent outline-none focus:border-black transition-colors resize-y",
                                    placeholder: "Discover our latest collection..."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1221,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1216,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "keywords",
                                    className: "block text-xs uppercase tracking-widest font-semibold mb-3",
                                    children: "Keywords (Comma Separated)"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1225,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    id: "keywords",
                                    name: "keywords",
                                    value: formData.keywords,
                                    onChange: handleChange,
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none",
                                    placeholder: "leather, bespoke, artisanal, ghana"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1226,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1224,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ImageUploader"], {
                                bucket: "site-assets",
                                folder: "og-images",
                                currentUrl: formData.og_image_url || null,
                                onUpload: (url)=>setFormData((prev_0)=>({
                                            ...prev_0,
                                            og_image_url: url
                                        })),
                                aspectRatio: "og",
                                label: "Social Share Image"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 1230,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1229,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: loading || saving,
                            className: "w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50",
                            children: saving ? "Saving..." : "Save Route Metadata"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1236,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 1197,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1196,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "sticky top-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4 mb-6",
                            children: "Google Search Preview"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1245,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white p-6 border border-neutral-200 shadow-sm font-sans max-w-md",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-[12px] text-neutral-800 flex items-center gap-2 mb-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-6 h-6 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-serif italic text-[10px]",
                                                children: "B"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 1249,
                                                columnNumber: 33
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1248,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "font-medium",
                                                    children: "Miss Tokyo"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 1252,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-neutral-500 text-[10px]",
                                                    children: [
                                                        "https://misstokyo.shop",
                                                        selectedPath
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 1253,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1251,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1247,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-[#1a0dab] text-lg font-medium cursor-pointer hover:underline mb-1 w-full truncate",
                                    children: formData.title || "Page Title Will Appear Here"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1256,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[13px] text-[#4d5156] leading-snug line-clamp-2",
                                    children: formData.description || "The meta description will appear here. Keep it under 160 characters to prevent it from being truncated in search results."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1259,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1246,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4 mb-6 mt-12",
                            children: "Social Card Preview"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1264,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white border text-center border-neutral-200 shadow-sm font-sans max-w-md overflow-hidden rounded-md",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-full h-48 bg-neutral-100 flex items-center justify-center text-neutral-400 capitalize",
                                    children: formData.og_image_url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: formData.og_image_url,
                                        alt: "Social Cover",
                                        className: "w-full h-full object-cover"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 1267,
                                        columnNumber: 54
                                    }, this) : "No Image Provided"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1266,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-4 bg-neutral-50 border-t border-neutral-200 text-left",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] uppercase tracking-widest text-neutral-500 mb-1",
                                            children: "misstokyo.shop"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1270,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-medium text-neutral-900 mb-1 truncate",
                                            children: formData.title || "Page Title"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1271,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-neutral-500 truncate",
                                            children: formData.description || "Page description..."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1272,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1269,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1265,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 1244,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1243,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
        lineNumber: 1194,
        columnNumber: 10
    }, this);
}
_s4(SEOTab, "U41P8vXDF7KvfimCWM7YSP+1rtU=");
_c4 = SEOTab;
const COMM_EVENTS = [
    {
        key: "order_confirmed",
        label: "Order Confirmed"
    },
    {
        key: "order_shipped",
        label: "Order Shipped"
    },
    {
        key: "order_cancelled",
        label: "Order Cancelled"
    },
    {
        key: "order_fulfilled",
        label: "Order Fulfilled"
    }
];
function CommunicationsTab() {
    _s5();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(30);
    if ($[0] !== "a357ead7613311db256cb6c5d4691d78d862f2c86031f192b99022e07efe2223") {
        for(let $i = 0; $i < 30; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "a357ead7613311db256cb6c5d4691d78d862f2c86031f192b99022e07efe2223";
    }
    const [channel, setChannel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("email");
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = [];
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    const [templates, setTemplates] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t0);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    let t1;
    let t2;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = ({
            "CommunicationsTab[useEffect()]": ()=>{
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("communication_templates").select("*").then({
                    "CommunicationsTab[useEffect() > (anonymous)()]": (t3)=>{
                        const { data } = t3;
                        setTemplates(data ?? []);
                        setLoading(false);
                    }
                }["CommunicationsTab[useEffect() > (anonymous)()]"]);
            }
        })["CommunicationsTab[useEffect()]"];
        t2 = [];
        $[2] = t1;
        $[3] = t2;
    } else {
        t1 = $[2];
        t2 = $[3];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t1, t2);
    let t3;
    if ($[4] !== channel || $[5] !== templates) {
        t3 = ({
            "CommunicationsTab[getTemplate]": (event_type)=>templates.find({
                    "CommunicationsTab[getTemplate > templates.find()]": (t)=>t.channel === channel && t.event_type === event_type
                }["CommunicationsTab[getTemplate > templates.find()]"]) ?? {
                    channel,
                    event_type,
                    subject: "",
                    greeting: "",
                    body_text: ""
                }
        })["CommunicationsTab[getTemplate]"];
        $[4] = channel;
        $[5] = templates;
        $[6] = t3;
    } else {
        t3 = $[6];
    }
    const getTemplate = t3;
    let t4;
    if ($[7] !== channel) {
        t4 = ({
            "CommunicationsTab[handleUpdate]": (event_type_0, field, value)=>{
                setTemplates({
                    "CommunicationsTab[handleUpdate > setTemplates()]": (prev)=>{
                        const exists = prev.find({
                            "CommunicationsTab[handleUpdate > setTemplates() > prev.find()]": (t_0)=>t_0.channel === channel && t_0.event_type === event_type_0
                        }["CommunicationsTab[handleUpdate > setTemplates() > prev.find()]"]);
                        if (exists) {
                            return prev.map({
                                "CommunicationsTab[handleUpdate > setTemplates() > prev.map()]": (t_1)=>t_1.channel === channel && t_1.event_type === event_type_0 ? {
                                        ...t_1,
                                        [field]: value
                                    } : t_1
                            }["CommunicationsTab[handleUpdate > setTemplates() > prev.map()]"]);
                        }
                        return [
                            ...prev,
                            {
                                channel,
                                event_type: event_type_0,
                                subject: null,
                                greeting: "",
                                body_text: "",
                                [field]: value
                            }
                        ];
                    }
                }["CommunicationsTab[handleUpdate > setTemplates()]"]);
            }
        })["CommunicationsTab[handleUpdate]"];
        $[7] = channel;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    const handleUpdate = t4;
    let t5;
    if ($[9] !== channel || $[10] !== getTemplate) {
        t5 = ({
            "CommunicationsTab[handleSave]": async (event_type_1)=>{
                const tpl = getTemplate(event_type_1);
                const key = `${channel}-${event_type_1}`;
                setSaving(key);
                const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("communication_templates").upsert({
                    ...tpl,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: "channel,event_type"
                });
                setSaving(null);
                if (error) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to save template.");
                } else {
                    setSaved(key);
                    setTimeout({
                        "CommunicationsTab[handleSave > setTimeout()]": ()=>setSaved(null)
                    }["CommunicationsTab[handleSave > setTimeout()]"], 3000);
                }
            }
        })["CommunicationsTab[handleSave]"];
        $[9] = channel;
        $[10] = getTemplate;
        $[11] = t5;
    } else {
        t5 = $[11];
    }
    const handleSave = t5;
    if (loading) {
        let t6;
        if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
            t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-neutral-400 italic font-serif",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1438,
                columnNumber: 12
            }, this);
            $[12] = t6;
        } else {
            t6 = $[12];
        }
        return t6;
    }
    let t6;
    let t7;
    if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4 mb-6",
            children: "Communication Templates"
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 1448,
            columnNumber: 10
        }, this);
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-[10px] text-neutral-400 tracking-wider uppercase mb-6",
            children: "Customise the messages sent to customers for each event. Dynamic values (order ID, rider info) are injected automatically."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 1449,
            columnNumber: 10
        }, this);
        $[13] = t6;
        $[14] = t7;
    } else {
        t6 = $[13];
        t7 = $[14];
    }
    let t8;
    if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = [
            "email",
            "sms"
        ];
        $[15] = t8;
    } else {
        t8 = $[15];
    }
    let t9;
    if ($[16] !== channel) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex gap-0 border-b border-neutral-200 mb-8",
            children: t8.map({
                "CommunicationsTab[(anonymous)()]": (ch)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: {
                            "CommunicationsTab[(anonymous)() > <button>.onClick]": ()=>setChannel(ch)
                        }["CommunicationsTab[(anonymous)() > <button>.onClick]"],
                        className: `px-6 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors ${channel === ch ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`,
                        children: ch === "email" ? "Email" : "SMS"
                    }, ch, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 1466,
                        columnNumber: 51
                    }, this)
            }["CommunicationsTab[(anonymous)()]"])
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 1465,
            columnNumber: 10
        }, this);
        $[16] = channel;
        $[17] = t9;
    } else {
        t9 = $[17];
    }
    let t10;
    if ($[18] !== channel || $[19] !== getTemplate || $[20] !== handleSave || $[21] !== handleUpdate || $[22] !== saved || $[23] !== saving) {
        t10 = COMM_EVENTS.map({
            "CommunicationsTab[COMM_EVENTS.map()]": (t11)=>{
                const { key: key_0, label } = t11;
                const tpl_0 = getTemplate(key_0);
                const saveKey = `${channel}-${key_0}`;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "border border-neutral-100 p-6 space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-[10px] font-semibold uppercase tracking-widest text-neutral-600",
                            children: label
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1485,
                            columnNumber: 85
                        }, this),
                        channel === "email" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500",
                                    children: "Subject Line"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1485,
                                    columnNumber: 211
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: tpl_0.subject ?? "",
                                    onChange: {
                                        "CommunicationsTab[COMM_EVENTS.map() > <input>.onChange]": (e)=>handleUpdate(key_0, "subject", e.target.value)
                                    }["CommunicationsTab[COMM_EVENTS.map() > <input>.onChange]"],
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                    placeholder: "Email subject..."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1485,
                                    columnNumber: 330
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1485,
                            columnNumber: 206
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500",
                                    children: "Greeting"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1487,
                                    columnNumber: 245
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: tpl_0.greeting ?? "",
                                    onChange: {
                                        "CommunicationsTab[COMM_EVENTS.map() > <input>.onChange]": (e_0)=>handleUpdate(key_0, "greeting", e_0.target.value)
                                    }["CommunicationsTab[COMM_EVENTS.map() > <input>.onChange]"],
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                    placeholder: channel === "email" ? "Hello," : "Miss Tokyo:"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1487,
                                    columnNumber: 360
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1487,
                            columnNumber: 240
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500",
                                    children: channel === "email" ? "Body Text" : "Message"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1489,
                                    columnNumber: 274
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    rows: channel === "email" ? 4 : 2,
                                    value: tpl_0.body_text,
                                    onChange: {
                                        "CommunicationsTab[COMM_EVENTS.map() > <textarea>.onChange]": (e_1)=>handleUpdate(key_0, "body_text", e_1.target.value)
                                    }["CommunicationsTab[COMM_EVENTS.map() > <textarea>.onChange]"],
                                    className: "w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-none",
                                    placeholder: "Message body..."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1489,
                                    columnNumber: 428
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1489,
                            columnNumber: 269
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: {
                                        "CommunicationsTab[COMM_EVENTS.map() > <button>.onClick]": ()=>handleSave(key_0)
                                    }["CommunicationsTab[COMM_EVENTS.map() > <button>.onClick]"],
                                    disabled: saving === saveKey,
                                    className: "px-6 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                                    children: saving === saveKey ? "Saving..." : "Save"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1491,
                                    columnNumber: 291
                                }, this),
                                saved === saveKey && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-[10px] text-green-600 uppercase tracking-wider",
                                    children: "Saved"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1493,
                                    columnNumber: 320
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1491,
                            columnNumber: 250
                        }, this)
                    ]
                }, key_0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 1485,
                    columnNumber: 16
                }, this);
            }
        }["CommunicationsTab[COMM_EVENTS.map()]"]);
        $[18] = channel;
        $[19] = getTemplate;
        $[20] = handleSave;
        $[21] = handleUpdate;
        $[22] = saved;
        $[23] = saving;
        $[24] = t10;
    } else {
        t10 = $[24];
    }
    let t11;
    if ($[25] !== t10) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-8",
            children: t10
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 1508,
            columnNumber: 11
        }, this);
        $[25] = t10;
        $[26] = t11;
    } else {
        t11 = $[26];
    }
    let t12;
    if ($[27] !== t11 || $[28] !== t9) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-8 max-w-3xl",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-8",
                children: [
                    t6,
                    t7,
                    t9,
                    t11
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1516,
                columnNumber: 48
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 1516,
            columnNumber: 11
        }, this);
        $[27] = t11;
        $[28] = t9;
        $[29] = t12;
    } else {
        t12 = $[29];
    }
    return t12;
}
_s5(CommunicationsTab, "fm0uzwmwjPowp3lDDHk0HK7hbls=");
_c5 = CommunicationsTab;
var _c, _c1, _c2, _c3, _c4, _c5;
__turbopack_context__.k.register(_c, "SettingsPage");
__turbopack_context__.k.register(_c1, "BusinessTab");
__turbopack_context__.k.register(_c2, "StoreTab");
__turbopack_context__.k.register(_c3, "CarouselConfigSection");
__turbopack_context__.k.register(_c4, "SEOTab");
__turbopack_context__.k.register(_c5, "CommunicationsTab");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_84a9e047._.js.map
module.exports = [
"[project]/src/lib/utils/imageCompression.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "compressToWebP",
    ()=>compressToWebP
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$browser$2d$image$2d$compression$2f$dist$2f$browser$2d$image$2d$compression$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/browser-image-compression/dist/browser-image-compression.mjs [app-ssr] (ecmascript)");
;
async function compressToWebP(file) {
    const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.93
    };
    const compressed = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$browser$2d$image$2d$compression$2f$dist$2f$browser$2d$image$2d$compression$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(file, options);
    // Rename to .webp
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([
        compressed
    ], `${baseName}.webp`, {
        type: "image/webp"
    });
}
}),
"[project]/src/lib/utils/videoConversion.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "convertToMp4",
    ()=>convertToMp4
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$ffmpeg$2f$dist$2f$esm$2f$empty$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@ffmpeg/ffmpeg/dist/esm/empty.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$util$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@ffmpeg/util/dist/esm/index.js [app-ssr] (ecmascript)");
;
;
let ffmpeg = null;
/**
 * Initializes and loads the FFmpeg instance.
 * Uses the v0.12+ API.
 */ async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$ffmpeg$2f$dist$2f$esm$2f$empty$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FFmpeg"]();
    // Using unpkg for core files to avoid local setup overhead
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
        coreURL: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$util$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toBlobURL"])(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$util$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toBlobURL"])(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
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
        await instance.writeFile(inputName, await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ffmpeg$2f$util$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchFile"])(file));
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
}),
"[project]/src/components/ui/miss-tokyo/ImageUploader.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ImageUploader",
    ()=>ImageUploader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$imageCompression$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/imageCompression.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$videoConversion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/videoConversion.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-ssr] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__GripVertical$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/grip-vertical.js [app-ssr] (ecmascript) <export default as GripVertical>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@dnd-kit/core/dist/core.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@dnd-kit/sortable/dist/sortable.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$utilities$2f$dist$2f$utilities$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@dnd-kit/utilities/dist/utilities.esm.js [app-ssr] (ecmascript)");
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
function SortableImage({ url, index, isPrimary, onRemove }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSortable"])({
        id: url
    });
    const style = {
        transform: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$utilities$2f$dist$2f$utilities$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CSS"].Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1
    };
    const isVideo = url.endsWith(".mp4");
    const handleRemove = (e)=>{
        e.stopPropagation();
        if (window.confirm("Are you sure you want to remove this image?")) {
            onRemove();
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: setNodeRef,
        style: style,
        className: "relative group aspect-square min-h-[10rem] overflow-hidden bg-neutral-100 border border-neutral-200 touch-none",
        children: [
            isVideo ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                src: url,
                className: "w-full h-full object-cover",
                muted: true
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 113,
                columnNumber: 17
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: url,
                alt: "",
                className: "w-full h-full object-cover"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 115,
                columnNumber: 17
            }, this),
            isPrimary && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute top-2 left-2 z-20 bg-black/70 text-white text-[8px] uppercase tracking-widest px-1.5 py-0.5 pointer-events-none",
                children: "Primary"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 119,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: handleRemove,
                "aria-label": "Remove image",
                className: "absolute top-2 right-2 z-30 bg-red-500 hover:bg-red-600 text-white p-2 min-w-[36px] min-h-[36px] rounded-md shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                    size: 14,
                    strokeWidth: 2
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                    lineNumber: 131,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 125,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: setActivatorNodeRef,
                ...attributes,
                ...listeners,
                "aria-label": "Drag to reorder",
                className: "absolute bottom-2 right-2 z-30 bg-black/60 hover:bg-black/80 text-white p-2 min-w-[36px] min-h-[36px] rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__GripVertical$3e$__["GripVertical"], {
                    size: 14,
                    strokeWidth: 2
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                    lineNumber: 142,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 135,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
        lineNumber: 107,
        columnNumber: 9
    }, this);
}
function ImageUploader(props) {
    const { bucket, folder = "", aspectRatio = "video", label } = props;
    const multiMode = isMultiMode(props);
    const initialUrls = multiMode ? props.currentUrls : props.currentUrl ? [
        props.currentUrl
    ] : [];
    const [previews, setPreviews] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(initialUrls);
    const [uploading, setUploading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [uploadCount, setUploadCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [isConverting, setIsConverting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [conversionProgress, setConversionProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeUrl, setActiveUrl] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const maxFiles = multiMode ? props.maxFiles ?? 1 : 1;
    const sensors = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSensors"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSensor"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PointerSensor"], {
        activationConstraint: {
            distance: 5
        }
    }), // TouchSensor with delay prevents scroll hijacking on mobile
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSensor"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TouchSensor"], {
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
                file = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$imageCompression$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compressToWebP"])(rawFile);
            } catch  {
                file = rawFile;
            }
        } else if (rawFile.type !== "video/mp4") {
            // Transcode non-mp4 videos
            try {
                setIsConverting(true);
                setConversionProgress(0);
                file = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$videoConversion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertToMp4"])(rawFile, (p)=>setConversionProgress(p));
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
        const { data, error: uploadErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].storage.from(bucket).upload(name, file, {
            contentType,
            upsert: false
        });
        if (uploadErr || !data) {
            setError(uploadErr?.message || "Upload failed.");
            return null;
        }
        const { data: { publicUrl } } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].storage.from(bucket).getPublicUrl(data.path);
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
        const updated = previews.filter((_, i)=>i !== index);
        setPreviews(updated);
        if (multiMode) {
            props.onUpload(updated);
        } else {
            props.onUpload("");
            props.onRemove?.();
        }
    };
    // ── Drag handlers ──────────────────────────────────────────────────────────
    const handleDragStart = (event)=>{
        setActiveUrl(event.active.id);
    };
    const handleDragEnd = (event)=>{
        setActiveUrl(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = previews.indexOf(active.id);
        const newIndex = previews.indexOf(over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const updated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["arrayMove"])(previews, oldIndex, newIndex);
        setPreviews(updated);
        if (multiMode) {
            props.onUpload(updated);
        }
    };
    // ── Render ─────────────────────────────────────────────────────────────────
    const showDropzone = previews.length < maxFiles;
    const loadingLabel = uploadCount > 1 ? `Uploading ${uploadCount} files...` : "Uploading...";
    // Active drag preview tile
    const activeIsVideo = activeUrl?.endsWith(".mp4");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-2",
        children: [
            label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "block text-xs uppercase tracking-widest font-semibold text-neutral-700",
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 302,
                        columnNumber: 21
                    }, this),
                    previews.length > 0 && props.onRemove && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>{
                            setPreviews([]);
                            props.onRemove?.();
                        },
                        className: "text-[10px] text-red-500 hover:text-red-700 tracking-widest uppercase font-semibold transition-colors",
                        children: "Remove All"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 306,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 301,
                columnNumber: 17
            }, this),
            previews.length > 0 && (multiMode ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DndContext"], {
                sensors: sensors,
                collisionDetection: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["closestCenter"],
                onDragStart: handleDragStart,
                onDragEnd: handleDragEnd,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SortableContext"], {
                        items: previews,
                        strategy: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$sortable$2f$dist$2f$sortable$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rectSortingStrategy"],
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 sm:grid-cols-3 gap-2",
                            children: previews.map((url, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SortableImage, {
                                    url: url,
                                    index: idx,
                                    isPrimary: idx === 0,
                                    onRemove: ()=>handleRemove(idx)
                                }, url, false, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                    lineNumber: 332,
                                    columnNumber: 37
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                            lineNumber: 330,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 329,
                        columnNumber: 25
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$dnd$2d$kit$2f$core$2f$dist$2f$core$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DragOverlay"], {
                        children: activeUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "aspect-square overflow-hidden border-2 border-black shadow-2xl opacity-90",
                            children: activeIsVideo ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                                src: activeUrl,
                                className: "w-full h-full object-cover",
                                muted: true
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 347,
                                columnNumber: 41
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: activeUrl,
                                alt: "",
                                className: "w-full h-full object-cover"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 349,
                                columnNumber: 41
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                            lineNumber: 345,
                            columnNumber: 33
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 343,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 323,
                columnNumber: 21
            }, this) : // Single mode — plain preview, no DnD
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `relative group overflow-hidden bg-neutral-100 border border-neutral-200 ${ASPECT_CLASSES[aspectRatio]}`,
                children: [
                    previews[0].endsWith(".mp4") ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                        src: previews[0],
                        className: "w-full h-full object-cover",
                        muted: true
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 359,
                        columnNumber: 29
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: previews[0],
                        alt: "",
                        className: "w-full h-full object-cover"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 361,
                        columnNumber: 29
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: (e)=>{
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to remove this image?")) {
                                handleRemove(0);
                            }
                        },
                        "aria-label": "Remove image",
                        className: "absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white p-2 min-w-[36px] min-h-[36px] rounded-md shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                            size: 13,
                            strokeWidth: 2
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                            lineNumber: 374,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 363,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 357,
                columnNumber: 21
            }, this)),
            showDropzone && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `${maxFiles === 1 && previews.length === 0 ? ASPECT_CLASSES[aspectRatio] : "h-24"} relative bg-neutral-100 border-2 border-dashed border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer group overflow-hidden`,
                onClick: ()=>!uploading && inputRef.current?.click(),
                onDrop: (e)=>{
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                },
                onDragOver: (e)=>e.preventDefault(),
                onDragEnter: (e)=>{
                    e.preventDefault();
                    e.currentTarget.classList.add("border-black");
                },
                onDragLeave: (e)=>{
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-black");
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400 px-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-6 h-6",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 1,
                                    d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                    lineNumber: 392,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 391,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500 text-center",
                                children: uploading ? loadingLabel : maxFiles > 1 ? "Click or drag to upload (multiple)" : "Click or drag to upload"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 394,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 390,
                        columnNumber: 21
                    }, this),
                    isConverting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 z-50",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 401,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] uppercase tracking-[0.2em] font-bold text-black",
                                        children: "Optimizing Video..."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                        lineNumber: 403,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[9px] text-neutral-400 uppercase tracking-widest font-bold font-mono italic",
                                        children: [
                                            conversionProgress,
                                            "% Complete — Please wait"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                        lineNumber: 404,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 402,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 400,
                        columnNumber: 25
                    }, this),
                    uploading && !isConverting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 z-40",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 413,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-700",
                                children: loadingLabel
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                                lineNumber: 414,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                        lineNumber: 412,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 382,
                columnNumber: 17
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-red-600 tracking-wide",
                children: error
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 420,
                columnNumber: 23
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ref: inputRef,
                type: "file",
                accept: ACCEPTED_ATTR,
                multiple: maxFiles > 1,
                className: "hidden",
                onChange: (e)=>{
                    handleFiles(e.target.files);
                    e.target.value = "";
                }
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
                lineNumber: 422,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/miss-tokyo/ImageUploader.tsx",
        lineNumber: 299,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/ui/TagInput.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TagInput",
    ()=>TagInput
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
function TagInput({ value, onChange, placeholder }) {
    const [inputValue, setInputValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const addTag = (raw)=>{
        const tag = raw.trim();
        if (!tag || value.includes(tag)) return;
        onChange([
            ...value,
            tag
        ]);
    };
    const removeTag = (index)=>{
        onChange(value.filter((_, i)=>i !== index));
    };
    const handleKeyDown = (e)=>{
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputValue);
            setInputValue("");
        } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
            removeTag(value.length - 1);
        }
    };
    const handleBlur = ()=>{
        if (inputValue.trim()) {
            addTag(inputValue);
            setInputValue("");
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-wrap items-center gap-1.5 min-h-[38px] w-full border-b border-neutral-300 bg-transparent py-1.5 focus-within:border-black transition-colors cursor-text",
        onClick: ()=>inputRef.current?.focus(),
        children: [
            value.map((tag, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "inline-flex items-center gap-1 bg-neutral-100 text-neutral-700 text-[11px] font-medium px-2 py-0.5 rounded-sm tracking-wide",
                    children: [
                        tag,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            "aria-label": `Remove ${tag}`,
                            onClick: (e)=>{
                                e.stopPropagation();
                                removeTag(i);
                            },
                            className: "text-neutral-400 hover:text-neutral-900 transition-colors leading-none ml-0.5",
                            children: "×"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/TagInput.tsx",
                            lineNumber: 53,
                            columnNumber: 21
                        }, this)
                    ]
                }, `${tag}-${i}`, true, {
                    fileName: "[project]/src/components/ui/TagInput.tsx",
                    lineNumber: 48,
                    columnNumber: 17
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ref: inputRef,
                type: "text",
                value: inputValue,
                onChange: (e)=>setInputValue(e.target.value),
                onKeyDown: handleKeyDown,
                onBlur: handleBlur,
                placeholder: value.length === 0 ? placeholder : "",
                className: "flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-neutral-800 placeholder:text-neutral-400 py-0.5"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/TagInput.tsx",
                lineNumber: 64,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/TagInput.tsx",
        lineNumber: 43,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/EmailsTab.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmailsTab",
    ()=>EmailsTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.js [app-ssr] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/message-square.js [app-ssr] (ecmascript) <export default as MessageSquare>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/send.js [app-ssr] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
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
function EmailPreview({ event, template, bizName }) {
    const name = bizName || "Miss Tokyo";
    const greeting = template.greeting || "Hello,";
    const body = template.body_text || "Your message body will appear here.";
    const subject = template.subject || event.label;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden text-xs",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border-b border-neutral-200 px-4 py-3 space-y-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-neutral-400 uppercase tracking-widest",
                        children: "Preview"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 130,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-neutral-700",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-neutral-400",
                                children: "Subject:"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 131,
                                columnNumber: 49
                            }, this),
                            " ",
                            subject
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 131,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-neutral-500 text-[10px]",
                        children: [
                            "From: ",
                            name,
                            " <no-reply@resend.dev>"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 132,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 129,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    fontFamily: "Georgia, serif",
                    padding: "24px 20px",
                    background: "#fafaf9"
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        maxWidth: 480,
                        margin: "0 auto",
                        background: "white",
                        border: "1px solid #e5e5e5",
                        padding: "32px 36px"
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            style: {
                                fontSize: 18,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                margin: "0 0 4px",
                                fontFamily: "Georgia, serif"
                            },
                            children: name
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 136,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                color: "#737373",
                                fontSize: 10,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                margin: "0 0 28px"
                            },
                            children: event.label
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 139,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontSize: 13,
                                color: "#171717",
                                margin: "0 0 16px",
                                fontFamily: "Georgia, serif"
                            },
                            children: greeting
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 142,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontSize: 13,
                                color: "#525252",
                                lineHeight: 1.8,
                                margin: "0 0 24px",
                                whiteSpace: "pre-wrap"
                            },
                            children: body
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 145,
                            columnNumber: 21
                        }, this),
                        event.key === "account_setup" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: "#171717",
                                display: "inline-block",
                                padding: "12px 20px",
                                marginBottom: 24
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    color: "white",
                                    fontSize: 10,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase"
                                },
                                children: "Set Up Your Account →"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 150,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 149,
                            columnNumber: 25
                        }, this),
                        event.key === "admin_new_order" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: "#171717",
                                display: "inline-block",
                                padding: "12px 20px",
                                marginBottom: 24
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    color: "white",
                                    fontSize: 10,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase"
                                },
                                children: "View Order in Dashboard →"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 157,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 156,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                borderTop: "1px solid #e5e5e5",
                                paddingTop: 16
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    fontSize: 10,
                                    color: "#a3a3a3",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.12em",
                                    margin: 0
                                },
                                children: [
                                    name,
                                    " · Accra, Ghana"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 163,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 162,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 135,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 134,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
        lineNumber: 128,
        columnNumber: 9
    }, this);
}
function SmsPreview({ template }) {
    const raw = [
        template.greeting,
        template.body_text
    ].filter(Boolean).join(" ") || "Your SMS message will appear here.";
    const preview = injectDummyVars(raw);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border-b border-neutral-200 px-4 py-3 space-y-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-neutral-400 uppercase tracking-widest",
                        children: "SMS Preview"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 179,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-neutral-400",
                        children: "Variables shown with sample values"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 180,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 178,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-6 flex justify-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-neutral-800 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[260px] text-sm leading-relaxed whitespace-pre-wrap",
                    children: preview
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 183,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 182,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-4 pb-4 text-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: `text-[10px] ${raw.length > 160 ? "text-red-500" : "text-neutral-400"}`,
                    children: [
                        raw.length,
                        " chars · ",
                        Math.ceil(raw.length / 160),
                        " SMS credit",
                        Math.ceil(raw.length / 160) > 1 ? "s" : ""
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 188,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 187,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
        lineNumber: 177,
        columnNumber: 9
    }, this);
}
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
function ChannelTab({ channel, bizName, templates, onUpdate, onSave, saving, saved, selectedKey, onSelectKey }) {
    const events = ALL_EVENTS.filter((e)=>e.channels.includes(channel));
    const selectedEvent = events.find((e)=>e.key === selectedKey) ?? events[0];
    const tpl = templates.find((t)=>t.channel === channel && t.event_type === selectedKey) ?? {
        channel,
        event_type: selectedKey,
        subject: "",
        greeting: "",
        body_text: ""
    };
    const saveKey = `${channel}-${selectedKey}`;
    const bodyRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    function insertVar(varLabel) {
        const el = bodyRef.current;
        if (!el) return;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const newVal = el.value.slice(0, start) + varLabel + el.value.slice(end);
        onUpdate(selectedKey, "body_text", newVal);
        // Restore cursor after the inserted text
        requestAnimationFrame(()=>{
            el.selectionStart = el.selectionEnd = start + varLabel.length;
            el.focus();
        });
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 lg:grid-cols-3 gap-8 items-start",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-1",
                children: events.map((ev)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>onSelectKey(ev.key),
                        className: `w-full text-left px-4 py-3 transition-colors border-l-2 ${selectedKey === ev.key ? "border-black bg-neutral-50 text-black" : "border-transparent text-neutral-500 hover:text-black hover:bg-neutral-50"}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-semibold uppercase tracking-widest",
                                children: ev.label
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 269,
                                columnNumber: 25
                            }, this),
                            ev.adminOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[10px] text-neutral-400 uppercase tracking-widest",
                                children: "Admin only"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 271,
                                columnNumber: 29
                            }, this),
                            ev.previewTag && !ev.adminOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[10px] text-neutral-400 uppercase tracking-widest",
                                children: ev.previewTag
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 274,
                                columnNumber: 29
                            }, this)
                        ]
                    }, ev.key, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 259,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 257,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white border border-neutral-200 p-6 space-y-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1",
                                    children: "Event"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 284,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm font-semibold",
                                    children: selectedEvent?.label
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 285,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-neutral-400 mt-1 leading-relaxed",
                                    children: selectedEvent?.description
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 286,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 283,
                            columnNumber: 21
                        }, this),
                        channel === "email" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Subject Line"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 291,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: tpl.subject ?? "",
                                    onChange: (e)=>onUpdate(selectedKey, "subject", e.target.value),
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                    placeholder: `${selectedEvent?.label} — Miss Tokyo`
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 292,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 290,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Greeting"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 303,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: tpl.greeting ?? "",
                                    onChange: (e)=>onUpdate(selectedKey, "greeting", e.target.value),
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                    placeholder: channel === "email" ? "Dear Customer," : "Miss Tokyo:"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 304,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 302,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: channel === "email" ? "Body Text" : "Message"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 314,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    ref: bodyRef,
                                    rows: channel === "email" ? 5 : 3,
                                    value: tpl.body_text,
                                    onChange: (e)=>onUpdate(selectedKey, "body_text", e.target.value),
                                    className: "w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-y",
                                    placeholder: channel === "email" ? "Your message body. Dynamic values like order ID and rider name are injected automatically." : "Short SMS message. Keep under 160 chars. Use variables below."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 317,
                                    columnNumber: 25
                                }, this),
                                channel === "sms" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: `text-[10px] mt-1 tracking-wide ${tpl.body_text.length > 160 ? "text-red-500" : "text-neutral-400"}`,
                                    children: [
                                        tpl.body_text.length,
                                        " / 160 characters"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 330,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 313,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-neutral-50 border border-neutral-100 p-3 space-y-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                    children: "Available variables"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 337,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-wrap gap-1.5",
                                    children: TEMPLATE_VARS.map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>insertVar(v.label),
                                            className: "font-mono text-[10px] px-2 py-1 bg-white border border-neutral-200 text-neutral-600 hover:border-black hover:text-black transition-colors rounded-sm",
                                            title: `Click to insert ${v.label}`,
                                            children: v.label
                                        }, v.key, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                            lineNumber: 340,
                                            columnNumber: 33
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 338,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-neutral-400",
                                    children: "Click a variable to insert it at cursor position."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 351,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 336,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-4 pt-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>onSave(selectedKey),
                                    disabled: saving === saveKey,
                                    className: "px-6 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                                    children: saving === saveKey ? "Saving..." : "Save Template"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 355,
                                    columnNumber: 25
                                }, this),
                                saved === saveKey && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-[10px] text-green-600 uppercase tracking-wider",
                                    children: "Saved"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 364,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 354,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 282,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 281,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: channel === "email" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(EmailPreview, {
                    event: selectedEvent,
                    template: tpl,
                    bizName: bizName
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 373,
                    columnNumber: 21
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SmsPreview, {
                    template: tpl
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 375,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 371,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
        lineNumber: 255,
        columnNumber: 9
    }, this);
}
function EmailsTab() {
    const [channel, setChannel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("email");
    const [templates, setTemplates] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [bizName, setBizName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("Miss Tokyo");
    // Lifted selection state so test buttons know the active template
    const emailEvents = ALL_EVENTS.filter((e)=>e.channels.includes("email"));
    const smsEvents = ALL_EVENTS.filter((e)=>e.channels.includes("sms"));
    const [emailSelectedKey, setEmailSelectedKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(emailEvents[0]?.key ?? "");
    const [smsSelectedKey, setSmsSelectedKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(smsEvents[0]?.key ?? "");
    const selectedKey = channel === "email" ? emailSelectedKey : smsSelectedKey;
    const setSelectedKey = channel === "email" ? setEmailSelectedKey : setSmsSelectedKey;
    // Test send state
    const [emailModal, setEmailModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [smsModal, setSmsModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [testEmail, setTestEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [testPhone, setTestPhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [testSending, setTestSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
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
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Enter an email address");
            return;
        }
        const tpl = getActiveTpl("email", emailSelectedKey);
        const eventDef = ALL_EVENTS.find((e)=>e.key === emailSelectedKey);
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
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Test email sent!");
            setEmailModal(false);
            setTestEmail("");
        } catch (e) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(e.message || "Failed to send");
        } finally{
            setTestSending(false);
        }
    }
    async function sendTestSMS() {
        if (!testPhone.trim()) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Enter a phone number");
            return;
        }
        const tpl = getActiveTpl("sms", smsSelectedKey);
        const message = injectDummyVars([
            tpl.greeting,
            tpl.body_text
        ].filter(Boolean).join(" ") || "Your Miss Tokyo order #TEST1234 is confirmed! Thank you.");
        setTestSending(true);
        try {
            const res = await fetch("/api/admin/test-sms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    phone: testPhone.trim(),
                    message
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed");
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Test SMS sent!");
            setSmsModal(false);
            setTestPhone("");
        } catch (e) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(e.message || "Failed to send");
        } finally{
            setTestSending(false);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("communication_templates").select("*"),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("business_settings").select("business_name").eq("id", "default").single()
        ]).then(([{ data: tpls }, { data: biz }])=>{
            setTemplates(tpls ?? []);
            if (biz?.business_name) setBizName(biz.business_name);
            setLoading(false);
        });
    }, []);
    const handleUpdate = (event_type, field, value)=>{
        setTemplates((prev)=>{
            const exists = prev.find((t)=>t.channel === channel && t.event_type === event_type);
            if (exists) {
                return prev.map((t)=>t.channel === channel && t.event_type === event_type ? {
                        ...t,
                        [field]: value
                    } : t);
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
    const handleSave = async (event_type)=>{
        const tpl = templates.find((t)=>t.channel === channel && t.event_type === event_type) ?? {
            channel,
            event_type,
            subject: null,
            greeting: "",
            body_text: ""
        };
        const key = `${channel}-${event_type}`;
        setSaving(key);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("communication_templates").upsert({
            ...tpl,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "channel,event_type"
        });
        setSaving(null);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to save template.");
        } else {
            setSaved(key);
            setTimeout(()=>setSaved(null), 3000);
        }
    };
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-neutral-400 italic font-serif",
        children: "Loading..."
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
        lineNumber: 512,
        columnNumber: 25
    }, this);
    const activeEmailEventLabel = ALL_EVENTS.find((e)=>e.key === emailSelectedKey)?.label ?? "Email";
    const activeSmsEventLabel = ALL_EVENTS.find((e)=>e.key === smsSelectedKey)?.label ?? "SMS";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-neutral-500",
                        children: "Edit transactional message templates and send test notifications."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 521,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setEmailModal(true),
                                className: "flex items-center gap-1.5 px-3 py-2 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                        size: 12
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                        lineNumber: 528,
                                        columnNumber: 25
                                    }, this),
                                    " Test Email"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 523,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setSmsModal(true),
                                className: "flex items-center gap-1.5 px-3 py-2 border border-neutral-300 text-neutral-600 text-[10px] uppercase tracking-widest hover:bg-neutral-50 transition-colors",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"], {
                                        size: 12
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                        lineNumber: 535,
                                        columnNumber: 25
                                    }, this),
                                    " Test SMS"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                lineNumber: 530,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 522,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 520,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-0 border-b border-neutral-200",
                children: [
                    "email",
                    "sms"
                ].map((ch)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setChannel(ch),
                        className: `px-8 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors ${channel === ch ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`,
                        children: ch === "email" ? "Email Templates" : "SMS Templates"
                    }, ch, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                        lineNumber: 543,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 541,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ChannelTab, {
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
                lineNumber: 556,
                columnNumber: 13
            }, this),
            emailModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white w-full max-w-md mx-4 p-8 rounded-2xl shadow-xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between mb-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "font-semibold text-base",
                                    children: "Send Test Email"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 574,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setEmailModal(false),
                                    className: "text-neutral-400 hover:text-black",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                        lineNumber: 575,
                                        columnNumber: 134
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 575,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 573,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-neutral-500 mb-1",
                            children: [
                                "Sending: ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-semibold text-black",
                                    children: activeEmailEventLabel
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 578,
                                    columnNumber: 38
                                }, this),
                                " template with dummy data."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 577,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                            lineNumber: 580,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "block text-xs uppercase tracking-widest text-neutral-500 mb-1.5",
                            children: "Email Address"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 583,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "email",
                            value: testEmail,
                            onChange: (e)=>setTestEmail(e.target.value),
                            onKeyDown: (e)=>e.key === "Enter" && sendTestEmail(),
                            placeholder: "you@example.com",
                            autoFocus: true,
                            className: "w-full border border-neutral-200 px-3 py-2.5 text-sm rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-black/10"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 584,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setEmailModal(false),
                                    className: "flex-1 border border-neutral-200 py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-50",
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 594,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: sendTestEmail,
                                    disabled: testSending,
                                    className: "flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                            size: 13
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                            lineNumber: 601,
                                            columnNumber: 33
                                        }, this),
                                        testSending ? "Sending…" : "Send Test"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 595,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 593,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 572,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 571,
                columnNumber: 17
            }, this),
            smsModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white w-full max-w-md mx-4 p-8 rounded-2xl shadow-xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between mb-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "font-semibold text-base",
                                    children: "Send Test SMS"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 613,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setSmsModal(false),
                                    className: "text-neutral-400 hover:text-black",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                        lineNumber: 614,
                                        columnNumber: 132
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 614,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 612,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-neutral-500 mb-5",
                            children: [
                                "Sending: ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-semibold text-black",
                                    children: activeSmsEventLabel
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 617,
                                    columnNumber: 38
                                }, this),
                                " template via MNotify."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 616,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "block text-xs uppercase tracking-widest text-neutral-500 mb-1.5",
                            children: "Phone Number"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 619,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "tel",
                            value: testPhone,
                            onChange: (e)=>setTestPhone(e.target.value),
                            onKeyDown: (e)=>e.key === "Enter" && sendTestSMS(),
                            placeholder: "0200000000 or +233200000000",
                            autoFocus: true,
                            className: "w-full border border-neutral-200 px-3 py-2.5 text-sm rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 620,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[10px] text-neutral-400 mb-6",
                            children: "Ghana numbers only. Format: 0XXXXXXXXX or +233XXXXXXXXX"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 629,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setSmsModal(false),
                                    className: "flex-1 border border-neutral-200 py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-50",
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 631,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: sendTestSMS,
                                    disabled: testSending,
                                    className: "flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                            size: 13
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                            lineNumber: 638,
                                            columnNumber: 33
                                        }, this),
                                        testSending ? "Sending…" : "Send Test"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                                    lineNumber: 632,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                            lineNumber: 630,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                    lineNumber: 611,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
                lineNumber: 610,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/EmailsTab.tsx",
        lineNumber: 518,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/NotificationsTab.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NotificationsTab",
    ()=>NotificationsTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-ssr] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2d$off$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BellOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell-off.js [app-ssr] (ecmascript) <export default as BellOff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rss$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Rss$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/rss.js [app-ssr] (ecmascript) <export default as Rss>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/send.js [app-ssr] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-ssr] (ecmascript) <export default as CheckCircle2>");
"use client";
;
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
    const [supported, setSupported] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [permission, setPermission] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("default");
    const [subscribed, setSubscribed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [template, setTemplate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        title: DEFAULT_TITLE,
        body: DEFAULT_BODY
    });
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [testSending, setTestSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [vapidConfigured, setVapidConfigured] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>!!("TURBOPACK compile-time value", "BDlpSwqVW4J83mcFbzyc63WK-zDBsxbFdis6whW6aU_ChHbV_4O9qArS269-ECM-n47mhT-YLOVcDlFgrX0IuFY"));
    const baseUrl = ("TURBOPACK compile-time value", "http://localhost:3000") || "https://misstokyo.shop";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            setSupported(false);
            return;
        }
        setPermission(Notification.permission);
        setVapidConfigured(!!("TURBOPACK compile-time value", "BDlpSwqVW4J83mcFbzyc63WK-zDBsxbFdis6whW6aU_ChHbV_4O9qArS269-ECM-n47mhT-YLOVcDlFgrX0IuFY"));
        // Register SW if not already registered
        navigator.serviceWorker.register("/sw.js").catch(console.error);
        // Check existing subscription
        navigator.serviceWorker.ready.then((reg)=>reg.pushManager.getSubscription()).then((sub)=>{
            setSubscribed(!!sub);
        });
        // Load saved template
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("push_notification_settings").select("title, body").eq("id", "default").maybeSingle().then(({ data })=>{
            if (data) setTemplate({
                title: data.title || DEFAULT_TITLE,
                body: data.body || DEFAULT_BODY
            });
        });
    }, []);
    async function handleSubscribe() {
        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== "granted") {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Notification permission denied. Please allow notifications in your browser settings.");
                return;
            }
            const sub = await subscribeToPush();
            if (!sub) {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to subscribe — check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local");
                return;
            }
            const res = await fetch("/api/admin/push/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    subscription: sub.toJSON()
                })
            });
            if (!res.ok) {
                const j = await res.json();
                throw new Error(j.error || "Subscribe failed");
            }
            setSubscribed(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Desktop notifications enabled!");
        } catch (err) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(err.message || "Failed to enable notifications");
        } finally{
            setLoading(false);
        }
    }
    async function handleUnsubscribe() {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch("/api/admin/push/subscribe", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        endpoint: sub.endpoint
                    })
                });
                await sub.unsubscribe();
            }
            setSubscribed(false);
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Notifications disabled.");
        } catch (err) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(err.message || "Failed to unsubscribe");
        } finally{
            setLoading(false);
        }
    }
    async function handleSaveTemplate() {
        setSaving(true);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("push_notification_settings").upsert({
            id: "default",
            title: template.title,
            body: template.body
        }, {
            onConflict: "id"
        });
        setSaving(false);
        if (error) __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to save template");
        else __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Template saved");
    }
    async function handleTestNotification() {
        if (!subscribed) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Enable notifications first");
            return;
        }
        setTestSending(true);
        try {
            const perm = Notification.permission;
            if (perm !== "granted") {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Notification permission is not granted");
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const body = (template.body || DEFAULT_BODY).replace("{order_id}", "TEST1234").replace("{customer_name}", "Test Customer").replace("{amount}", "GH₵ 1,200.00");
            await reg.showNotification(template.title || DEFAULT_TITLE, {
                body,
                tag: "mt-test",
                data: {
                    url: "/sales/orders"
                },
                requireInteraction: false
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Test notification sent! Check your system notifications.");
        } catch (err) {
            console.error("[push test]", err);
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(err.message || "Failed — check browser notification permissions");
        } finally{
            setTestSending(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-10 max-w-2xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-start justify-between gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xs font-semibold uppercase tracking-widest mb-1",
                                        children: "Desktop Notifications"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 193,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] text-neutral-500 leading-relaxed",
                                        children: "Get a browser desktop notification instantly when a new order is placed. Each admin browser must subscribe separately."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 194,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 192,
                                columnNumber: 21
                            }, this),
                            subscribed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                size: 20,
                                className: "text-emerald-500 shrink-0 mt-0.5"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 200,
                                columnNumber: 27
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                size: 20,
                                className: "text-neutral-300 shrink-0 mt-0.5"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 201,
                                columnNumber: 27
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 191,
                        columnNumber: 17
                    }, this),
                    !supported && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] text-amber-700 rounded-sm",
                        children: "Your browser doesn't support Web Push notifications."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 206,
                        columnNumber: 21
                    }, this),
                    supported && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            !vapidConfigured && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-amber-50 border border-amber-200 px-4 py-3 rounded-sm space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] font-semibold text-amber-700 uppercase tracking-widest",
                                        children: "VAPID Key Not Configured"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 215,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] text-amber-600 leading-relaxed",
                                        children: [
                                            "Push notifications require ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                className: "bg-amber-100 px-1 rounded",
                                                children: "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                lineNumber: 217,
                                                columnNumber: 64
                                            }, this),
                                            " and ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                className: "bg-amber-100 px-1 rounded",
                                                children: "VAPID_PRIVATE_KEY"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                lineNumber: 217,
                                                columnNumber: 148
                                            }, this),
                                            " in your environment variables. Generate them using the setup instructions below."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 216,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 214,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `w-2 h-2 rounded-full ${subscribed ? "bg-emerald-400" : "bg-neutral-300"}`
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 222,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-neutral-600",
                                        children: subscribed ? "Subscribed on this device" : "Not subscribed on this device"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 223,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 221,
                                columnNumber: 25
                            }, this),
                            permission === "denied" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[11px] text-red-500",
                                children: "Notifications are blocked. Open browser settings → Site Settings → Notifications and allow this site."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 229,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-3",
                                children: !subscribed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handleSubscribe,
                                    disabled: loading || permission === "denied" || !supported,
                                    className: "flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-40",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                            size: 12
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                            lineNumber: 242,
                                            columnNumber: 37
                                        }, this),
                                        loading ? "Subscribing…" : "Enable Notifications"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                    lineNumber: 236,
                                    columnNumber: 33
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleTestNotification,
                                            disabled: testSending,
                                            className: "flex items-center gap-2 px-4 py-2.5 border border-neutral-300 text-neutral-600 text-[10px] uppercase tracking-widest hover:bg-neutral-50 transition-colors disabled:opacity-40",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                                    size: 12
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                    lineNumber: 253,
                                                    columnNumber: 41
                                                }, this),
                                                testSending ? "Sending…" : "Send Test"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                            lineNumber: 247,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleUnsubscribe,
                                            disabled: loading,
                                            className: "flex items-center gap-2 px-4 py-2.5 border border-neutral-200 text-neutral-400 text-[10px] uppercase tracking-widest hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2d$off$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BellOff$3e$__["BellOff"], {
                                                    size: 12
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                    lineNumber: 262,
                                                    columnNumber: 41
                                                }, this),
                                                "Disable"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                            lineNumber: 256,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 234,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border-t border-neutral-100 pt-4 space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 uppercase tracking-widest font-semibold",
                                        children: "Setup"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 270,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-500 leading-relaxed",
                                        children: [
                                            "Generate VAPID keys once and add to ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                className: "bg-neutral-100 px-1 rounded",
                                                children: ".env.local"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                lineNumber: 272,
                                                columnNumber: 69
                                            }, this),
                                            ":"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 271,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                                        className: "text-[10px] bg-neutral-50 border border-neutral-100 p-3 rounded text-neutral-600 overflow-x-auto leading-relaxed",
                                        children: `npx web-push generate-vapid-keys

NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
VAPID_PRIVATE_KEY=<privateKey>
VAPID_SUBJECT=mailto:admin@misstokyo.shop`
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 274,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 269,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                lineNumber: 190,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest mb-1",
                                children: "Notification Template"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 287,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[11px] text-neutral-500",
                                children: "Customise what appears in the desktop push notification for new orders."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 288,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 286,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                children: "Title"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 292,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                                lineNumber: 293,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 291,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                children: "Body"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 303,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                rows: 3,
                                value: template.body,
                                onChange: (e)=>setTemplate((t)=>({
                                            ...t,
                                            body: e.target.value
                                        })),
                                placeholder: DEFAULT_BODY,
                                className: "w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-none"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 304,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 302,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-neutral-50 border border-neutral-100 p-3 space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                children: "Available variables"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 314,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap gap-2",
                                children: TEMPLATE_VARS.map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-mono text-[10px] px-2 py-1 bg-white border border-neutral-200 text-neutral-600 rounded-sm",
                                        children: [
                                            v.label,
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-neutral-400",
                                                children: [
                                                    "— ",
                                                    v.desc
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                                lineNumber: 318,
                                                columnNumber: 43
                                            }, this)
                                        ]
                                    }, v.label, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 317,
                                        columnNumber: 29
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 315,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 313,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: handleSaveTemplate,
                        disabled: saving,
                        className: "px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                        children: saving ? "Saving…" : "Save Template"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 324,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                lineNumber: 285,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-start gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rss$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Rss$3e$__["Rss"], {
                                size: 18,
                                className: "text-orange-400 shrink-0 mt-0.5"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 337,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xs font-semibold uppercase tracking-widest mb-1",
                                        children: "RSS Feed — New Arrivals"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 339,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] text-neutral-500 leading-relaxed",
                                        children: "A public RSS feed of your 20 most recent active products. Automatically updates every hour. Share this link with customers or plug it into RSS readers and aggregators."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                        lineNumber: 340,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 338,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 336,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2 bg-neutral-50 border border-neutral-100 px-3 py-2.5 rounded-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                className: "text-xs text-neutral-700 flex-1 break-all",
                                children: [
                                    baseUrl,
                                    "/rss.xml"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 348,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>{
                                    navigator.clipboard.writeText(`${baseUrl}/rss.xml`);
                                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Copied!");
                                },
                                className: "text-[10px] uppercase tracking-widest text-neutral-500 hover:text-black transition-colors whitespace-nowrap",
                                children: "Copy"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                                lineNumber: 349,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 347,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-neutral-400",
                        children: "Excludes wholesale-only products. Only published (active) products appear."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                        lineNumber: 361,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
                lineNumber: 335,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/NotificationsTab.tsx",
        lineNumber: 187,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/RidersTab.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RidersTab",
    ()=>RidersTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/ImageUploader.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/pencil.js [app-ssr] (ecmascript) <export default as Pencil>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-ssr] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-ssr] (ecmascript) <export default as Plus>");
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
    const [riders, setRiders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isAdding, setIsAdding] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(EMPTY_FORM);
    const [editingId, setEditingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editForm, setEditForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(EMPTY_FORM);
    const [confirmDeleteId, setConfirmDeleteId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetch = async ()=>{
        setLoading(true);
        const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("riders").select("*").order("full_name");
        if (data) setRiders(data);
        setLoading(false);
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        fetch();
    }, []);
    const handleAdd = async (e)=>{
        e.preventDefault();
        if (!form.full_name || !form.phone_number) return;
        setSaving(true);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("riders").insert([
            {
                full_name: form.full_name,
                phone_number: form.phone_number,
                bike_reg: form.bike_reg || null,
                image_url: form.image_url || null,
                is_active: true
            }
        ]);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to add rider.");
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Rider added.");
            setForm(EMPTY_FORM);
            setIsAdding(false);
            await fetch();
        }
        setSaving(false);
    };
    const startEdit = (r)=>{
        setEditingId(r.id);
        setEditForm({
            full_name: r.full_name,
            phone_number: r.phone_number,
            bike_reg: r.bike_reg || "",
            image_url: r.image_url || ""
        });
    };
    const handleSaveEdit = async (id)=>{
        setSaving(true);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("riders").update({
            full_name: editForm.full_name,
            phone_number: editForm.phone_number,
            bike_reg: editForm.bike_reg || null,
            image_url: editForm.image_url || null
        }).eq("id", id);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to update rider.");
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Rider updated.");
            setEditingId(null);
            await fetch();
        }
        setSaving(false);
    };
    const toggleActive = async (id, is_active)=>{
        setRiders((prev)=>prev.map((r)=>r.id === id ? {
                    ...r,
                    is_active: !is_active
                } : r));
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("riders").update({
            is_active: !is_active
        }).eq("id", id);
    };
    const handleDelete = async (id)=>{
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("riders").delete().eq("id", id);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to delete rider.");
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Rider removed.");
            setRiders((prev)=>prev.filter((r)=>r.id !== id));
        }
        setConfirmDeleteId(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8 max-w-4xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest",
                                children: "Rider Profiles"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 117,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-neutral-400 mt-1 uppercase tracking-widest",
                                children: "Manage delivery riders for dispatch assignment."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 118,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 116,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setIsAdding(!isAdding),
                        className: "flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                size: 13
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 124,
                                columnNumber: 21
                            }, this),
                            " ",
                            isAdding ? "Cancel" : "Add Rider"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 120,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                lineNumber: 115,
                columnNumber: 13
            }, this),
            isAdding && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                onSubmit: handleAdd,
                className: "bg-white border border-neutral-200 p-8 space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                        children: "New Rider"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 131,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                children: "Full Name *"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 135,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                required: true,
                                                value: form.full_name,
                                                onChange: (e)=>setForm((p)=>({
                                                            ...p,
                                                            full_name: e.target.value
                                                        })),
                                                className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                                placeholder: "Kwame Asante"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 136,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 134,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                children: "Phone Number *"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 142,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                required: true,
                                                value: form.phone_number,
                                                onChange: (e)=>setForm((p)=>({
                                                            ...p,
                                                            phone_number: e.target.value
                                                        })),
                                                className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                                placeholder: "+233 20 000 0000"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 143,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 141,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                children: "Bike Registration"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 149,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                value: form.bike_reg,
                                                onChange: (e)=>setForm((p)=>({
                                                            ...p,
                                                            bike_reg: e.target.value
                                                        })),
                                                className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                                placeholder: "GR-1234-23"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 150,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 148,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 133,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ImageUploader"], {
                                    bucket: "product-images",
                                    folder: "riders",
                                    currentUrl: form.image_url || null,
                                    onUpload: (url)=>setForm((p)=>({
                                                ...p,
                                                image_url: url
                                            })),
                                    aspectRatio: "square",
                                    label: "Rider Photo"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 157,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 156,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 132,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-end border-t border-neutral-100 pt-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: saving,
                            className: "px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50",
                            children: saving ? "Saving..." : "Add Rider"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 168,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                        lineNumber: 167,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                lineNumber: 130,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 overflow-x-auto",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "w-full text-sm text-left whitespace-nowrap",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            className: "bg-neutral-50 border-b border-neutral-200",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 w-16",
                                        children: "Photo"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 181,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500",
                                        children: "Name"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 182,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500",
                                        children: "Phone"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 183,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500",
                                        children: "Bike Reg"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 184,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500",
                                        children: "Status"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 185,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-6 py-4 w-20"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                        lineNumber: 186,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 180,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 179,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            className: "divide-y divide-neutral-100",
                            children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    colSpan: 6,
                                    className: "px-6 py-12 text-center text-neutral-400 italic font-serif",
                                    children: "Loading..."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 191,
                                    columnNumber: 33
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 191,
                                columnNumber: 29
                            }, this) : riders.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    colSpan: 6,
                                    className: "px-6 py-12 text-center text-neutral-400 italic font-serif",
                                    children: "No riders yet. Add your first above."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 193,
                                    columnNumber: 33
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                lineNumber: 193,
                                columnNumber: 29
                            }, this) : riders.map((rider)=>editingId === rider.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: "bg-neutral-50",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-12 h-12",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ImageUploader"], {
                                                    bucket: "product-images",
                                                    folder: "riders",
                                                    currentUrl: editForm.image_url || null,
                                                    onUpload: (url)=>setEditForm((p)=>({
                                                                ...p,
                                                                image_url: url
                                                            })),
                                                    aspectRatio: "square",
                                                    label: ""
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                    lineNumber: 199,
                                                    columnNumber: 45
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 198,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 197,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: editForm.full_name,
                                                onChange: (e)=>setEditForm((p)=>({
                                                            ...p,
                                                            full_name: e.target.value
                                                        })),
                                                className: "border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 207,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 206,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: editForm.phone_number,
                                                onChange: (e)=>setEditForm((p)=>({
                                                            ...p,
                                                            phone_number: e.target.value
                                                        })),
                                                className: "border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 212,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 211,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: editForm.bike_reg,
                                                onChange: (e)=>setEditForm((p)=>({
                                                            ...p,
                                                            bike_reg: e.target.value
                                                        })),
                                                className: "border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full font-mono text-xs"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 217,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 216,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4 text-xs text-neutral-400 italic",
                                            children: "editing"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 221,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3 justify-end",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>handleSaveEdit(rider.id),
                                                        disabled: saving,
                                                        className: "text-green-600 hover:text-green-800 disabled:opacity-50",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                            size: 16
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                            lineNumber: 225,
                                                            columnNumber: 117
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                        lineNumber: 224,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setEditingId(null),
                                                        className: "text-neutral-400 hover:text-black",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                            size: 16
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                            lineNumber: 227,
                                                            columnNumber: 95
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                        lineNumber: 226,
                                                        columnNumber: 45
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 223,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 222,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, rider.id, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 196,
                                    columnNumber: 33
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: "hover:bg-neutral-50 transition-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-10 h-10 bg-neutral-100 overflow-hidden flex-shrink-0",
                                                children: rider.image_url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                    src: rider.image_url,
                                                    alt: rider.full_name,
                                                    className: "w-full h-full object-cover"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                    lineNumber: 236,
                                                    columnNumber: 51
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-full h-full bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-400 uppercase",
                                                    children: rider.full_name.charAt(0)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                    lineNumber: 237,
                                                    columnNumber: 51
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 234,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 233,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4 font-medium",
                                            children: rider.full_name
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 241,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4 font-mono text-xs text-neutral-600",
                                            children: rider.phone_number
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 242,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4 font-mono text-xs text-neutral-500",
                                            children: rider.bike_reg || "—"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 243,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>toggleActive(rider.id, rider.is_active),
                                                className: `px-2 py-1 text-[10px] uppercase tracking-widest rounded ${rider.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`,
                                                children: rider.is_active ? "Active" : "Inactive"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 245,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 244,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-6 py-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3 justify-end",
                                                children: confirmDeleteId === rider.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleDelete(rider.id),
                                                            className: "text-xs uppercase tracking-widest text-red-600 hover:text-red-800 font-semibold",
                                                            children: "Yes"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                            lineNumber: 254,
                                                            columnNumber: 53
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>setConfirmDeleteId(null),
                                                            className: "text-xs uppercase tracking-widest text-neutral-400 hover:text-black",
                                                            children: "No"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                            lineNumber: 256,
                                                            columnNumber: 53
                                                        }, this)
                                                    ]
                                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>startEdit(rider),
                                                            className: "text-neutral-400 hover:text-black transition-colors",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__["Pencil"], {
                                                                size: 14
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                                lineNumber: 262,
                                                                columnNumber: 121
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                            lineNumber: 261,
                                                            columnNumber: 53
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>setConfirmDeleteId(rider.id),
                                                            className: "text-neutral-400 hover:text-red-600 transition-colors",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                                size: 14
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                                lineNumber: 264,
                                                                columnNumber: 123
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                            lineNumber: 263,
                                                            columnNumber: 53
                                                        }, this)
                                                    ]
                                                }, void 0, true)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                                lineNumber: 251,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                            lineNumber: 250,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, rider.id, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                                    lineNumber: 232,
                                    columnNumber: 33
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                            lineNumber: 189,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                    lineNumber: 178,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
                lineNumber: 177,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/RidersTab.tsx",
        lineNumber: 114,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SizeGuideTab",
    ()=>SizeGuideTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
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
    const [rows, setRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULTS);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_copy").select("value").eq("copy_key", "size_guide_rows").single().then(({ data })=>{
            if (data?.value) {
                try {
                    setRows(JSON.parse(data.value));
                } catch  {}
            }
            setLoading(false);
        });
    }, []);
    const handleChange = (index, field, value)=>{
        setRows((prev)=>prev.map((row, i)=>i === index ? {
                    ...row,
                    [field]: value
                } : row));
    };
    const handleAddRow = ()=>{
        setRows((prev)=>[
                ...prev,
                {
                    label: "",
                    bust: "",
                    waist: "",
                    hips: ""
                }
            ]);
    };
    const handleRemoveRow = (index)=>{
        setRows((prev)=>prev.filter((_, i)=>i !== index));
    };
    const handleReset = ()=>setRows(DEFAULTS);
    const handleSave = async ()=>{
        setSaving(true);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_copy").upsert({
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
        setTimeout(()=>setSaved(false), 2000);
    };
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-neutral-400 italic font-serif py-8",
        children: "Loading size guide..."
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
        lineNumber: 79,
        columnNumber: 25
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-sm font-semibold uppercase tracking-widest mb-2",
                        children: "Size Guide Editor"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                        lineNumber: 84,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-neutral-500 text-sm leading-relaxed",
                        children: "Edit the size guide shown on all product pages. Measurements are in centimetres. Changes are reflected immediately on the storefront."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                        lineNumber: 85,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                lineNumber: 83,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "overflow-x-auto border border-neutral-200",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "w-full border-collapse min-w-[500px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                className: "bg-neutral-50 border-b border-neutral-200",
                                children: [
                                    FIELDS.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "text-[10px] uppercase tracking-widest text-left py-3 px-4 font-semibold text-neutral-500",
                                            children: f.label
                                        }, f.key, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                            lineNumber: 96,
                                            columnNumber: 33
                                        }, this)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "py-3 px-4 w-10"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                        lineNumber: 100,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                lineNumber: 94,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                            lineNumber: 93,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            children: rows.map((row, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: "border-b border-neutral-100 last:border-0",
                                    children: [
                                        FIELDS.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-4 py-2",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: row[f.key],
                                                    onChange: (e)=>handleChange(i, f.key, e.target.value),
                                                    placeholder: f.label,
                                                    className: "w-full border-b border-neutral-200 bg-transparent py-1.5 text-sm outline-none focus:border-black transition-colors"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                                    lineNumber: 108,
                                                    columnNumber: 41
                                                }, this)
                                            }, f.key, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                                lineNumber: 107,
                                                columnNumber: 37
                                            }, this)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-4 py-2 text-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>handleRemoveRow(i),
                                                className: "text-neutral-300 hover:text-red-500 transition-colors text-sm leading-none",
                                                title: "Remove row",
                                                children: "✕"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                                lineNumber: 118,
                                                columnNumber: 37
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                            lineNumber: 117,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, i, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                                    lineNumber: 105,
                                    columnNumber: 29
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                            lineNumber: 103,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                    lineNumber: 92,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                lineNumber: 91,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4 flex-wrap",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleAddRow,
                        className: "text-[10px] uppercase tracking-widest font-bold border border-neutral-200 px-5 py-2.5 hover:border-black transition-colors",
                        children: "+ Add Row"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                        lineNumber: 133,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleReset,
                        className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-black transition-colors underline underline-offset-4",
                        children: "Reset to Defaults"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                        lineNumber: 139,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleSave,
                        disabled: saving,
                        className: "px-8 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 ml-auto",
                        children: saving ? "Saving..." : saved ? "Saved ✓" : "Save Size Guide"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                        lineNumber: 145,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                lineNumber: 132,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[10px] text-neutral-400 tracking-wider",
                children: "Tip: You can add custom rows for regional sizes (e.g., EU 36, UK 8) or remove irrelevant sizes."
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
                lineNumber: 154,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx",
        lineNumber: 82,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/data:7b9476 [app-ssr] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "inviteTeamMember",
    ()=>$$RSC_SERVER_ACTION_0
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-ssr] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"4045a8f3c29aa4fdd90b0e4f4beead23aad28fcf69":"inviteTeamMember"},"src/app/(dashboard)/settings/actions.ts",""] */ "use turbopack no side effects";
;
const $$RSC_SERVER_ACTION_0 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createServerReference"])("4045a8f3c29aa4fdd90b0e4f4beead23aad28fcf69", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["findSourceMapURL"], "inviteTeamMember");
;
 //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlU2VydmVyXCI7XG5pbXBvcnQgeyBzdXBhYmFzZUFkbWluIH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlQWRtaW5cIjtcbmltcG9ydCB7IGdldFVybCB9IGZyb20gXCJAL2xpYi91dGlscy9nZXRVcmxcIjtcbmltcG9ydCB7IFJlc2VuZCB9IGZyb20gXCJyZXNlbmRcIjtcbmltcG9ydCB7IHNlbmRTTVMgfSBmcm9tIFwiQC9saWIvc21zXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGxvZ0FjdGl2aXR5IH0gZnJvbSBcIkAvbGliL3V0aWxzL2xvZ0FjdGl2aXR5XCI7XG5cbmNvbnN0IHJlc2VuZCA9IG5ldyBSZXNlbmQocHJvY2Vzcy5lbnYuUkVTRU5EX0FQSV9LRVkhKTtcblxuaW50ZXJmYWNlIEludml0ZURhdGEge1xuICAgIGZ1bGxOYW1lOiBzdHJpbmc7XG4gICAgZW1haWw6IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZztcbiAgICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnZpdGVUZWFtTWVtYmVyKGRhdGE6IEludml0ZURhdGEpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuXG4gICAgaWYgKHVzZXJFcnJvciB8fCAhdXNlckRhdGE/LnVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XG4gICAgfVxuXG4gICAgLy8gR2V0IGNhbGxlcidzIHJvbGVcbiAgICBjb25zdCB7IGRhdGE6IGNhbGxlclByb2ZpbGUgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKFwicHJvZmlsZXNcIilcbiAgICAgICAgLnNlbGVjdChcInJvbGVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlckRhdGEudXNlci5pZClcbiAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgY29uc3QgdG9rZW4gPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICBjb25zdCBkeW5hbWljSG9zdCA9IGF3YWl0IGdldFVybCgpO1xuICAgIGNvbnN0IGludml0ZUxpbmsgPSBgJHtkeW5hbWljSG9zdH0vaW52aXRlP3Rva2VuPSR7dG9rZW59YDtcblxuICAgIGNvbnN0IHsgZXJyb3I6IGluc2VydEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmZyb20oXCJ0ZWFtX2ludml0YXRpb25zXCIpLmluc2VydCh7XG4gICAgICAgIGZ1bGxfbmFtZTogZGF0YS5mdWxsTmFtZSxcbiAgICAgICAgZW1haWw6IGRhdGEuZW1haWwsXG4gICAgICAgIHBob25lOiBkYXRhLnBob25lIHx8IG51bGwsXG4gICAgICAgIHJvbGU6IGRhdGEucm9sZSxcbiAgICAgICAgdG9rZW4sXG4gICAgICAgIGludml0ZWRfYnk6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgfSk7XG5cbiAgICBpZiAoaW5zZXJ0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkludml0ZSBpbnNlcnRpb24gZXJyb3I6XCIsIGluc2VydEVycm9yKTtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZhaWxlZCB0byBjcmVhdGUgaW52aXRhdGlvbiByZWNvcmQuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBMT0cgQUNUSVZJVFlcbiAgICBhd2FpdCBsb2dBY3Rpdml0eSh7XG4gICAgICAgIHVzZXJJZDogdXNlckRhdGEudXNlci5pZCxcbiAgICAgICAgdXNlclJvbGU6IGNhbGxlclByb2ZpbGU/LnJvbGUgfHwgJ2FkbWluJyxcbiAgICAgICAgYWN0aW9uVHlwZTogXCJJTlZJVEVcIixcbiAgICAgICAgcmVzb3VyY2U6IFwidGVhbVwiLFxuICAgICAgICBkZXRhaWxzOiB7IGVtYWlsOiBkYXRhLmVtYWlsLCByb2xlOiBkYXRhLnJvbGUgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IGBZb3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gY29sbGFib3JhdGUgb24gTWlzcyBUb2t5byBhcyBhICR7ZGF0YS5yb2xlfS4gSm9pbiBoZXJlOiAke2ludml0ZUxpbmt9YDtcblxuICAgIC8vIDEuIEZvcm1hdCBQaG9uZSBOdW1iZXIgKEdoYW5hIHN0YW5kYXJkICsyMzMpXG4gICAgbGV0IGZvcm1hdHRlZFBob25lID0gZGF0YS5waG9uZTtcbiAgICBpZiAoZm9ybWF0dGVkUGhvbmUpIHtcbiAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBmb3JtYXR0ZWRQaG9uZS5yZXBsYWNlKC9cXEQvZywgXCJcIik7XG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZS5zdGFydHNXaXRoKFwiMFwiKSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBcIjIzM1wiICsgZm9ybWF0dGVkUGhvbmUuc2xpY2UoMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWZvcm1hdHRlZFBob25lLnN0YXJ0c1dpdGgoXCIyMzNcIikpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIyMzNcIiArIGZvcm1hdHRlZFBob25lO1xuICAgICAgICB9XG4gICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIrXCIgKyBmb3JtYXR0ZWRQaG9uZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBhd2FpdCByZXNlbmQuZW1haWxzLnNlbmQoe1xuICAgICAgICAgICAgZnJvbTogcHJvY2Vzcy5lbnYuUkVTRU5EX0ZST01fRU1BSUwgfHwgXCJvcmRlcnNAaW5mby5taXNzdG9reW8uc2hvcFwiLFxuICAgICAgICAgICAgdG86IGRhdGEuZW1haWwsXG4gICAgICAgICAgICBzdWJqZWN0OiBcIkludml0YXRpb24gdG8gSm9pbiBNaXNzIFRva3lvIFRlYW1cIixcbiAgICAgICAgICAgIHRleHQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICBodG1sOiBgPHA+WW91IGhhdmUgYmVlbiBpbnZpdGVkIHRvIGNvbGxhYm9yYXRlIG9uIE1pc3MgVG9reW8gYXMgYSA8c3Ryb25nPiR7ZGF0YS5yb2xlfTwvc3Ryb25nPi48L3A+PHA+PGEgaHJlZj1cIiR7aW52aXRlTGlua31cIj5DbGljayBoZXJlIHRvIGFjY2VwdCB5b3VyIGludml0YXRpb248L2E+PC9wPmAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBzZW5kU01TKHsgdG86IGZvcm1hdHRlZFBob25lLCBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoc21zRXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlNNUyBmYWlsZWQsIGJ1dCBlbWFpbCBzZW50OlwiLCBzbXNFcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHdhcm5pbmc6ICdFbWFpbCBzZW50LCBidXQgU01TIGZhaWxlZC4nIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIGludml0ZSBlbWFpbHM6XCIsIGVycik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZpdGF0aW9uIHNhdmVkLCBidXQgZmFpbGVkIHRvIGRpc3BhdGNoIGNvbW11bmljYXRpb25zLlwiIH07XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlVGVhbU1lbWJlcih1c2VySWQ6IHN0cmluZykge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBkYXRhOiB1c2VyRGF0YSwgZXJyb3I6IHVzZXJFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XG5cbiAgICBpZiAodXNlckVycm9yIHx8ICF1c2VyRGF0YT8udXNlcikge1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcbiAgICB9XG5cbiAgICAvLyBDUklUSUNBTCBTRUNVUklUWTogVmVyaWZ5IGNhbGxlciBpcyBhbiBhZG1pbiBvciBvd25lclxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgICAgIFxuICAgIGlmICghY2FsbGVyRGF0YSB8fCAoY2FsbGVyRGF0YS5yb2xlICE9PSAnYWRtaW4nICYmIGNhbGxlckRhdGEucm9sZSAhPT0gJ293bmVyJykpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gcmVtb3ZlIG1lbWJlcnMuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBEZW1vdGUgcm9sZSB0byAnY3VzdG9tZXInIHNvIHRoZXkgbG9zZSBkYXNoYm9hcmQgYWNjZXNzIHdpdGhvdXQgZGVzdHJveWluZ1xuICAgIC8vIHRoZWlyIGFjY291bnQgb3IgdHJpZ2dlcmluZyBGSyBjb25zdHJhaW50IGZhaWx1cmVzIG9uIG9yZGVycy9wb3Nfc2Vzc2lvbnMvbG9ncy5cbiAgICBjb25zdCB7IGVycm9yOiBkZW1vdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgICAuZnJvbShcInByb2ZpbGVzXCIpXG4gICAgICAgIC51cGRhdGUoeyByb2xlOiBcImN1c3RvbWVyXCIgfSlcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlcklkKTtcblxuICAgIGlmIChkZW1vdGVFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGRlbW90ZSB1c2VyIElEXCIsIHVzZXJJZCwgZGVtb3RlRXJyb3IpO1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRmFpbGVkIHRvIHJlbW92ZSB0ZWFtIG1lbWJlci5cIiB9O1xuICAgIH1cblxuICAgIC8vIEZvcmNlIHNpZ24tb3V0IHNvIHRoZSByZW1vdmVkIG1lbWJlcidzIHNlc3Npb24gZW5kcyBpbW1lZGlhdGVseS5cbiAgICBhd2FpdCBzdXBhYmFzZUFkbWluLmF1dGguYWRtaW4uc2lnbk91dCh1c2VySWQsIFwiZ2xvYmFsXCIpO1xuXG4gICAgLy8gTE9HIEFDVElWSVRZXG4gICAgYXdhaXQgbG9nQWN0aXZpdHkoe1xuICAgICAgICB1c2VySWQ6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgICAgIHVzZXJSb2xlOiBjYWxsZXJEYXRhLnJvbGUsXG4gICAgICAgIGFjdGlvblR5cGU6IFwiUkVNT1ZFX01FTUJFUlwiLFxuICAgICAgICByZXNvdXJjZTogXCJ0ZWFtXCIsXG4gICAgICAgIHJlc291cmNlSWQ6IHVzZXJJZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZFBhc3N3b3JkUmVzZXRMaW5rKHRhcmdldEVtYWlsOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIGlmICh1c2VyRXJyb3IgfHwgIXVzZXJEYXRhPy51c2VyKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcblxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgaWYgKCFjYWxsZXJEYXRhIHx8IChjYWxsZXJEYXRhLnJvbGUgIT09IFwiYWRtaW5cIiAmJiBjYWxsZXJEYXRhLnJvbGUgIT09IFwib3duZXJcIikpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gc2VuZCByZXNldCBsaW5rcy5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHsgY3JlYXRlQ2xpZW50OiBjcmVhdGVTZXJ2aWNlQ2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIik7XG4gICAgY29uc3QgYWRtaW5DbGllbnQgPSBjcmVhdGVTZXJ2aWNlQ2xpZW50KFxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxuICAgICAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZISxcbiAgICAgICAgeyBhdXRoOiB7IGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLCBwZXJzaXN0U2Vzc2lvbjogZmFsc2UgfSB9XG4gICAgKTtcblxuICAgIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcImh0dHBzOi8vbWlzc3Rva3lvLnNob3BcIjtcblxuICAgIC8vIEZldGNoIGJpeiBuYW1lIHNvIHRoZSBlbWFpbCBoZWFkZXIgbWF0Y2hlcyB0aGUgcmVzdCBvZiB0aGUgc3lzdGVtXG4gICAgY29uc3QgeyBkYXRhOiBiaXogfSA9IGF3YWl0IGFkbWluQ2xpZW50XG4gICAgICAgIC5mcm9tKFwiYnVzaW5lc3Nfc2V0dGluZ3NcIilcbiAgICAgICAgLnNlbGVjdChcImJ1c2luZXNzX25hbWVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgXCJkZWZhdWx0XCIpXG4gICAgICAgIC5zaW5nbGUoKTtcbiAgICBjb25zdCBiaXpOYW1lID0gKGJpeiBhcyBhbnkpPy5idXNpbmVzc19uYW1lIHx8IFwiTWlzcyBUb2t5b1wiO1xuXG4gICAgY29uc3QgeyBkYXRhOiBsaW5rRGF0YSwgZXJyb3I6IGxpbmtFcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuYXV0aC5hZG1pbi5nZW5lcmF0ZUxpbmsoe1xuICAgICAgICB0eXBlOiBcInJlY292ZXJ5XCIsXG4gICAgICAgIGVtYWlsOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgb3B0aW9uczogeyByZWRpcmVjdFRvOiBgJHtzaXRlVXJsfS9hY2NvdW50L3Jlc2V0LXBhc3N3b3JkYCB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGxpbmtFcnJvciB8fCAhbGlua0RhdGEpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGdlbmVyYXRlTGluayBmYWlsZWQ6XCIsIGxpbmtFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGYWlsZWQgdG8gZ2VuZXJhdGUgcmVzZXQgbGluay5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc2V0TGluayA9IChsaW5rRGF0YSBhcyBhbnkpPy5wcm9wZXJ0aWVzPy5hY3Rpb25fbGluaztcbiAgICBpZiAoIXJlc2V0TGluaykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkNvdWxkIG5vdCByZXRyaWV2ZSByZXNldCBsaW5rLlwiIH07XG5cbiAgICBjb25zdCB7IHNlbmRFbWFpbCB9ID0gYXdhaXQgaW1wb3J0KFwiQC9saWIvZW1haWxcIik7XG4gICAgY29uc3QgeyBvaywgZXJyb3I6IGVtYWlsRXJyb3IgfSA9IGF3YWl0IHNlbmRFbWFpbCh7XG4gICAgICAgIHRvOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgc3ViamVjdDogYFJlc2V0IHlvdXIgJHtiaXpOYW1lfSBwYXNzd29yZGAsXG4gICAgICAgIGh0bWw6IGBcbjwhRE9DVFlQRSBodG1sPlxuPGh0bWw+XG48Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBHZW9yZ2lhLCBzZXJpZjsgYmFja2dyb3VuZDogI2ZhZmFmOTsgbWFyZ2luOiAwOyBwYWRkaW5nOiA0MHB4IDIwcHg7XCI+XG4gIDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDU2MHB4OyBtYXJnaW46IDAgYXV0bzsgYmFja2dyb3VuZDogd2hpdGU7IGJvcmRlcjogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmc6IDQ4cHg7XCI+XG4gICAgPGgxIHN0eWxlPVwiZm9udC1zaXplOiAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBtYXJnaW46IDAgMCA4cHg7XCI+JHtiaXpOYW1lfTwvaDE+XG4gICAgPHAgc3R5bGU9XCJjb2xvcjogIzczNzM3MzsgZm9udC1zaXplOiAxMXB4OyBsZXR0ZXItc3BhY2luZzogMC4yZW07IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IG1hcmdpbjogMCAwIDQwcHg7XCI+UGFzc3dvcmQgUmVzZXQ8L3A+XG5cbiAgICA8aDIgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7IGZvbnQtd2VpZ2h0OiBub3JtYWw7IGNvbG9yOiAjMTcxNzE3OyBtYXJnaW46IDAgMCAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4wNWVtO1wiPlxuICAgICAgUmVzZXQgeW91ciBwYXNzd29yZFxuICAgIDwvaDI+XG5cbiAgICA8cCBzdHlsZT1cImZvbnQtc2l6ZTogMTRweDsgY29sb3I6ICM1MjUyNTI7IGxpbmUtaGVpZ2h0OiAxLjg7IG1hcmdpbjogMCAwIDMycHg7XCI+XG4gICAgICBBbiBhZG1pbiBoYXMgcmVxdWVzdGVkIGEgcGFzc3dvcmQgcmVzZXQgZm9yIHlvdXIgYWNjb3VudC4gQ2xpY2sgdGhlIGJ1dHRvbiBiZWxvdyB0byBzZXQgYSBuZXcgcGFzc3dvcmQuIFRoaXMgbGluayBleHBpcmVzIGluIDEgaG91ci5cbiAgICA8L3A+XG5cbiAgICA8YSBocmVmPVwiJHtyZXNldExpbmt9XCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazsgYmFja2dyb3VuZDogIzE3MTcxNzsgY29sb3I6IHdoaXRlOyB0ZXh0LWRlY29yYXRpb246IG5vbmU7IGZvbnQtc2l6ZTogMTBweDsgbGV0dGVyLXNwYWNpbmc6IDAuMmVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBwYWRkaW5nOiAxNnB4IDMycHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC13ZWlnaHQ6IDcwMDsgbWFyZ2luLWJvdHRvbTogMzJweDtcIj5cbiAgICAgIFJlc2V0IE15IFBhc3N3b3JkIOKGklxuICAgIDwvYT5cblxuICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxM3B4OyBjb2xvcjogIzczNzM3MzsgbGluZS1oZWlnaHQ6IDEuODsgbWFyZ2luOiAwIDAgMzJweDtcIj5cbiAgICAgIElmIHlvdSBkaWQgbm90IGV4cGVjdCB0aGlzIGVtYWlsLCB5b3UgY2FuIHNhZmVseSBpZ25vcmUgaXQg4oCUIHlvdXIgYWNjb3VudCByZW1haW5zIHNlY3VyZS5cbiAgICA8L3A+XG5cbiAgICA8ZGl2IHN0eWxlPVwiYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmctdG9wOiAyNHB4OyBtYXJnaW4tdG9wOiAyNHB4O1wiPlxuICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiAjYTNhM2EzOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyBtYXJnaW46IDA7XCI+XG4gICAgICAgICR7Yml6TmFtZX1cbiAgICAgIDwvcD5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YCxcbiAgICB9KTtcblxuICAgIGlmICghb2spIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGVtYWlsIGZhaWxlZDpcIiwgZW1haWxFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJSZXNldCBsaW5rIGdlbmVyYXRlZCBidXQgZW1haWwgZmFpbGVkIHRvIHNlbmQuXCIgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjRTQW1Cc0IsNkxBQUEifQ==
}),
"[project]/src/app/(dashboard)/settings/data:77941c [app-ssr] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "removeTeamMember",
    ()=>$$RSC_SERVER_ACTION_1
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-ssr] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"40dd4b387ad58896edeb12776262a085056554847f":"removeTeamMember"},"src/app/(dashboard)/settings/actions.ts",""] */ "use turbopack no side effects";
;
const $$RSC_SERVER_ACTION_1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createServerReference"])("40dd4b387ad58896edeb12776262a085056554847f", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["findSourceMapURL"], "removeTeamMember");
;
 //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlU2VydmVyXCI7XG5pbXBvcnQgeyBzdXBhYmFzZUFkbWluIH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlQWRtaW5cIjtcbmltcG9ydCB7IGdldFVybCB9IGZyb20gXCJAL2xpYi91dGlscy9nZXRVcmxcIjtcbmltcG9ydCB7IFJlc2VuZCB9IGZyb20gXCJyZXNlbmRcIjtcbmltcG9ydCB7IHNlbmRTTVMgfSBmcm9tIFwiQC9saWIvc21zXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGxvZ0FjdGl2aXR5IH0gZnJvbSBcIkAvbGliL3V0aWxzL2xvZ0FjdGl2aXR5XCI7XG5cbmNvbnN0IHJlc2VuZCA9IG5ldyBSZXNlbmQocHJvY2Vzcy5lbnYuUkVTRU5EX0FQSV9LRVkhKTtcblxuaW50ZXJmYWNlIEludml0ZURhdGEge1xuICAgIGZ1bGxOYW1lOiBzdHJpbmc7XG4gICAgZW1haWw6IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZztcbiAgICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnZpdGVUZWFtTWVtYmVyKGRhdGE6IEludml0ZURhdGEpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuXG4gICAgaWYgKHVzZXJFcnJvciB8fCAhdXNlckRhdGE/LnVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XG4gICAgfVxuXG4gICAgLy8gR2V0IGNhbGxlcidzIHJvbGVcbiAgICBjb25zdCB7IGRhdGE6IGNhbGxlclByb2ZpbGUgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKFwicHJvZmlsZXNcIilcbiAgICAgICAgLnNlbGVjdChcInJvbGVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlckRhdGEudXNlci5pZClcbiAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgY29uc3QgdG9rZW4gPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICBjb25zdCBkeW5hbWljSG9zdCA9IGF3YWl0IGdldFVybCgpO1xuICAgIGNvbnN0IGludml0ZUxpbmsgPSBgJHtkeW5hbWljSG9zdH0vaW52aXRlP3Rva2VuPSR7dG9rZW59YDtcblxuICAgIGNvbnN0IHsgZXJyb3I6IGluc2VydEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmZyb20oXCJ0ZWFtX2ludml0YXRpb25zXCIpLmluc2VydCh7XG4gICAgICAgIGZ1bGxfbmFtZTogZGF0YS5mdWxsTmFtZSxcbiAgICAgICAgZW1haWw6IGRhdGEuZW1haWwsXG4gICAgICAgIHBob25lOiBkYXRhLnBob25lIHx8IG51bGwsXG4gICAgICAgIHJvbGU6IGRhdGEucm9sZSxcbiAgICAgICAgdG9rZW4sXG4gICAgICAgIGludml0ZWRfYnk6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgfSk7XG5cbiAgICBpZiAoaW5zZXJ0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkludml0ZSBpbnNlcnRpb24gZXJyb3I6XCIsIGluc2VydEVycm9yKTtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZhaWxlZCB0byBjcmVhdGUgaW52aXRhdGlvbiByZWNvcmQuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBMT0cgQUNUSVZJVFlcbiAgICBhd2FpdCBsb2dBY3Rpdml0eSh7XG4gICAgICAgIHVzZXJJZDogdXNlckRhdGEudXNlci5pZCxcbiAgICAgICAgdXNlclJvbGU6IGNhbGxlclByb2ZpbGU/LnJvbGUgfHwgJ2FkbWluJyxcbiAgICAgICAgYWN0aW9uVHlwZTogXCJJTlZJVEVcIixcbiAgICAgICAgcmVzb3VyY2U6IFwidGVhbVwiLFxuICAgICAgICBkZXRhaWxzOiB7IGVtYWlsOiBkYXRhLmVtYWlsLCByb2xlOiBkYXRhLnJvbGUgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IGBZb3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gY29sbGFib3JhdGUgb24gTWlzcyBUb2t5byBhcyBhICR7ZGF0YS5yb2xlfS4gSm9pbiBoZXJlOiAke2ludml0ZUxpbmt9YDtcblxuICAgIC8vIDEuIEZvcm1hdCBQaG9uZSBOdW1iZXIgKEdoYW5hIHN0YW5kYXJkICsyMzMpXG4gICAgbGV0IGZvcm1hdHRlZFBob25lID0gZGF0YS5waG9uZTtcbiAgICBpZiAoZm9ybWF0dGVkUGhvbmUpIHtcbiAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBmb3JtYXR0ZWRQaG9uZS5yZXBsYWNlKC9cXEQvZywgXCJcIik7XG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZS5zdGFydHNXaXRoKFwiMFwiKSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBcIjIzM1wiICsgZm9ybWF0dGVkUGhvbmUuc2xpY2UoMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWZvcm1hdHRlZFBob25lLnN0YXJ0c1dpdGgoXCIyMzNcIikpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIyMzNcIiArIGZvcm1hdHRlZFBob25lO1xuICAgICAgICB9XG4gICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIrXCIgKyBmb3JtYXR0ZWRQaG9uZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBhd2FpdCByZXNlbmQuZW1haWxzLnNlbmQoe1xuICAgICAgICAgICAgZnJvbTogcHJvY2Vzcy5lbnYuUkVTRU5EX0ZST01fRU1BSUwgfHwgXCJvcmRlcnNAaW5mby5taXNzdG9reW8uc2hvcFwiLFxuICAgICAgICAgICAgdG86IGRhdGEuZW1haWwsXG4gICAgICAgICAgICBzdWJqZWN0OiBcIkludml0YXRpb24gdG8gSm9pbiBNaXNzIFRva3lvIFRlYW1cIixcbiAgICAgICAgICAgIHRleHQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICBodG1sOiBgPHA+WW91IGhhdmUgYmVlbiBpbnZpdGVkIHRvIGNvbGxhYm9yYXRlIG9uIE1pc3MgVG9reW8gYXMgYSA8c3Ryb25nPiR7ZGF0YS5yb2xlfTwvc3Ryb25nPi48L3A+PHA+PGEgaHJlZj1cIiR7aW52aXRlTGlua31cIj5DbGljayBoZXJlIHRvIGFjY2VwdCB5b3VyIGludml0YXRpb248L2E+PC9wPmAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBzZW5kU01TKHsgdG86IGZvcm1hdHRlZFBob25lLCBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoc21zRXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlNNUyBmYWlsZWQsIGJ1dCBlbWFpbCBzZW50OlwiLCBzbXNFcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHdhcm5pbmc6ICdFbWFpbCBzZW50LCBidXQgU01TIGZhaWxlZC4nIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIGludml0ZSBlbWFpbHM6XCIsIGVycik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZpdGF0aW9uIHNhdmVkLCBidXQgZmFpbGVkIHRvIGRpc3BhdGNoIGNvbW11bmljYXRpb25zLlwiIH07XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlVGVhbU1lbWJlcih1c2VySWQ6IHN0cmluZykge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBkYXRhOiB1c2VyRGF0YSwgZXJyb3I6IHVzZXJFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XG5cbiAgICBpZiAodXNlckVycm9yIHx8ICF1c2VyRGF0YT8udXNlcikge1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcbiAgICB9XG5cbiAgICAvLyBDUklUSUNBTCBTRUNVUklUWTogVmVyaWZ5IGNhbGxlciBpcyBhbiBhZG1pbiBvciBvd25lclxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgICAgIFxuICAgIGlmICghY2FsbGVyRGF0YSB8fCAoY2FsbGVyRGF0YS5yb2xlICE9PSAnYWRtaW4nICYmIGNhbGxlckRhdGEucm9sZSAhPT0gJ293bmVyJykpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gcmVtb3ZlIG1lbWJlcnMuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBEZW1vdGUgcm9sZSB0byAnY3VzdG9tZXInIHNvIHRoZXkgbG9zZSBkYXNoYm9hcmQgYWNjZXNzIHdpdGhvdXQgZGVzdHJveWluZ1xuICAgIC8vIHRoZWlyIGFjY291bnQgb3IgdHJpZ2dlcmluZyBGSyBjb25zdHJhaW50IGZhaWx1cmVzIG9uIG9yZGVycy9wb3Nfc2Vzc2lvbnMvbG9ncy5cbiAgICBjb25zdCB7IGVycm9yOiBkZW1vdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgICAuZnJvbShcInByb2ZpbGVzXCIpXG4gICAgICAgIC51cGRhdGUoeyByb2xlOiBcImN1c3RvbWVyXCIgfSlcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlcklkKTtcblxuICAgIGlmIChkZW1vdGVFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGRlbW90ZSB1c2VyIElEXCIsIHVzZXJJZCwgZGVtb3RlRXJyb3IpO1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRmFpbGVkIHRvIHJlbW92ZSB0ZWFtIG1lbWJlci5cIiB9O1xuICAgIH1cblxuICAgIC8vIEZvcmNlIHNpZ24tb3V0IHNvIHRoZSByZW1vdmVkIG1lbWJlcidzIHNlc3Npb24gZW5kcyBpbW1lZGlhdGVseS5cbiAgICBhd2FpdCBzdXBhYmFzZUFkbWluLmF1dGguYWRtaW4uc2lnbk91dCh1c2VySWQsIFwiZ2xvYmFsXCIpO1xuXG4gICAgLy8gTE9HIEFDVElWSVRZXG4gICAgYXdhaXQgbG9nQWN0aXZpdHkoe1xuICAgICAgICB1c2VySWQ6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgICAgIHVzZXJSb2xlOiBjYWxsZXJEYXRhLnJvbGUsXG4gICAgICAgIGFjdGlvblR5cGU6IFwiUkVNT1ZFX01FTUJFUlwiLFxuICAgICAgICByZXNvdXJjZTogXCJ0ZWFtXCIsXG4gICAgICAgIHJlc291cmNlSWQ6IHVzZXJJZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZFBhc3N3b3JkUmVzZXRMaW5rKHRhcmdldEVtYWlsOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIGlmICh1c2VyRXJyb3IgfHwgIXVzZXJEYXRhPy51c2VyKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcblxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgaWYgKCFjYWxsZXJEYXRhIHx8IChjYWxsZXJEYXRhLnJvbGUgIT09IFwiYWRtaW5cIiAmJiBjYWxsZXJEYXRhLnJvbGUgIT09IFwib3duZXJcIikpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gc2VuZCByZXNldCBsaW5rcy5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHsgY3JlYXRlQ2xpZW50OiBjcmVhdGVTZXJ2aWNlQ2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIik7XG4gICAgY29uc3QgYWRtaW5DbGllbnQgPSBjcmVhdGVTZXJ2aWNlQ2xpZW50KFxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxuICAgICAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZISxcbiAgICAgICAgeyBhdXRoOiB7IGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLCBwZXJzaXN0U2Vzc2lvbjogZmFsc2UgfSB9XG4gICAgKTtcblxuICAgIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcImh0dHBzOi8vbWlzc3Rva3lvLnNob3BcIjtcblxuICAgIC8vIEZldGNoIGJpeiBuYW1lIHNvIHRoZSBlbWFpbCBoZWFkZXIgbWF0Y2hlcyB0aGUgcmVzdCBvZiB0aGUgc3lzdGVtXG4gICAgY29uc3QgeyBkYXRhOiBiaXogfSA9IGF3YWl0IGFkbWluQ2xpZW50XG4gICAgICAgIC5mcm9tKFwiYnVzaW5lc3Nfc2V0dGluZ3NcIilcbiAgICAgICAgLnNlbGVjdChcImJ1c2luZXNzX25hbWVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgXCJkZWZhdWx0XCIpXG4gICAgICAgIC5zaW5nbGUoKTtcbiAgICBjb25zdCBiaXpOYW1lID0gKGJpeiBhcyBhbnkpPy5idXNpbmVzc19uYW1lIHx8IFwiTWlzcyBUb2t5b1wiO1xuXG4gICAgY29uc3QgeyBkYXRhOiBsaW5rRGF0YSwgZXJyb3I6IGxpbmtFcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuYXV0aC5hZG1pbi5nZW5lcmF0ZUxpbmsoe1xuICAgICAgICB0eXBlOiBcInJlY292ZXJ5XCIsXG4gICAgICAgIGVtYWlsOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgb3B0aW9uczogeyByZWRpcmVjdFRvOiBgJHtzaXRlVXJsfS9hY2NvdW50L3Jlc2V0LXBhc3N3b3JkYCB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGxpbmtFcnJvciB8fCAhbGlua0RhdGEpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGdlbmVyYXRlTGluayBmYWlsZWQ6XCIsIGxpbmtFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGYWlsZWQgdG8gZ2VuZXJhdGUgcmVzZXQgbGluay5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc2V0TGluayA9IChsaW5rRGF0YSBhcyBhbnkpPy5wcm9wZXJ0aWVzPy5hY3Rpb25fbGluaztcbiAgICBpZiAoIXJlc2V0TGluaykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkNvdWxkIG5vdCByZXRyaWV2ZSByZXNldCBsaW5rLlwiIH07XG5cbiAgICBjb25zdCB7IHNlbmRFbWFpbCB9ID0gYXdhaXQgaW1wb3J0KFwiQC9saWIvZW1haWxcIik7XG4gICAgY29uc3QgeyBvaywgZXJyb3I6IGVtYWlsRXJyb3IgfSA9IGF3YWl0IHNlbmRFbWFpbCh7XG4gICAgICAgIHRvOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgc3ViamVjdDogYFJlc2V0IHlvdXIgJHtiaXpOYW1lfSBwYXNzd29yZGAsXG4gICAgICAgIGh0bWw6IGBcbjwhRE9DVFlQRSBodG1sPlxuPGh0bWw+XG48Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBHZW9yZ2lhLCBzZXJpZjsgYmFja2dyb3VuZDogI2ZhZmFmOTsgbWFyZ2luOiAwOyBwYWRkaW5nOiA0MHB4IDIwcHg7XCI+XG4gIDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDU2MHB4OyBtYXJnaW46IDAgYXV0bzsgYmFja2dyb3VuZDogd2hpdGU7IGJvcmRlcjogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmc6IDQ4cHg7XCI+XG4gICAgPGgxIHN0eWxlPVwiZm9udC1zaXplOiAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBtYXJnaW46IDAgMCA4cHg7XCI+JHtiaXpOYW1lfTwvaDE+XG4gICAgPHAgc3R5bGU9XCJjb2xvcjogIzczNzM3MzsgZm9udC1zaXplOiAxMXB4OyBsZXR0ZXItc3BhY2luZzogMC4yZW07IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IG1hcmdpbjogMCAwIDQwcHg7XCI+UGFzc3dvcmQgUmVzZXQ8L3A+XG5cbiAgICA8aDIgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7IGZvbnQtd2VpZ2h0OiBub3JtYWw7IGNvbG9yOiAjMTcxNzE3OyBtYXJnaW46IDAgMCAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4wNWVtO1wiPlxuICAgICAgUmVzZXQgeW91ciBwYXNzd29yZFxuICAgIDwvaDI+XG5cbiAgICA8cCBzdHlsZT1cImZvbnQtc2l6ZTogMTRweDsgY29sb3I6ICM1MjUyNTI7IGxpbmUtaGVpZ2h0OiAxLjg7IG1hcmdpbjogMCAwIDMycHg7XCI+XG4gICAgICBBbiBhZG1pbiBoYXMgcmVxdWVzdGVkIGEgcGFzc3dvcmQgcmVzZXQgZm9yIHlvdXIgYWNjb3VudC4gQ2xpY2sgdGhlIGJ1dHRvbiBiZWxvdyB0byBzZXQgYSBuZXcgcGFzc3dvcmQuIFRoaXMgbGluayBleHBpcmVzIGluIDEgaG91ci5cbiAgICA8L3A+XG5cbiAgICA8YSBocmVmPVwiJHtyZXNldExpbmt9XCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazsgYmFja2dyb3VuZDogIzE3MTcxNzsgY29sb3I6IHdoaXRlOyB0ZXh0LWRlY29yYXRpb246IG5vbmU7IGZvbnQtc2l6ZTogMTBweDsgbGV0dGVyLXNwYWNpbmc6IDAuMmVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBwYWRkaW5nOiAxNnB4IDMycHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC13ZWlnaHQ6IDcwMDsgbWFyZ2luLWJvdHRvbTogMzJweDtcIj5cbiAgICAgIFJlc2V0IE15IFBhc3N3b3JkIOKGklxuICAgIDwvYT5cblxuICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxM3B4OyBjb2xvcjogIzczNzM3MzsgbGluZS1oZWlnaHQ6IDEuODsgbWFyZ2luOiAwIDAgMzJweDtcIj5cbiAgICAgIElmIHlvdSBkaWQgbm90IGV4cGVjdCB0aGlzIGVtYWlsLCB5b3UgY2FuIHNhZmVseSBpZ25vcmUgaXQg4oCUIHlvdXIgYWNjb3VudCByZW1haW5zIHNlY3VyZS5cbiAgICA8L3A+XG5cbiAgICA8ZGl2IHN0eWxlPVwiYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmctdG9wOiAyNHB4OyBtYXJnaW4tdG9wOiAyNHB4O1wiPlxuICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiAjYTNhM2EzOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyBtYXJnaW46IDA7XCI+XG4gICAgICAgICR7Yml6TmFtZX1cbiAgICAgIDwvcD5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YCxcbiAgICB9KTtcblxuICAgIGlmICghb2spIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGVtYWlsIGZhaWxlZDpcIiwgZW1haWxFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJSZXNldCBsaW5rIGdlbmVyYXRlZCBidXQgZW1haWwgZmFpbGVkIHRvIHNlbmQuXCIgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjRTQW9Hc0IsNkxBQUEifQ==
}),
"[project]/src/app/(dashboard)/settings/data:0b49c5 [app-ssr] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "sendPasswordResetLink",
    ()=>$$RSC_SERVER_ACTION_2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-ssr] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"400a18c9a7d32c2174cc981a7b14c4d51b65064595":"sendPasswordResetLink"},"src/app/(dashboard)/settings/actions.ts",""] */ "use turbopack no side effects";
;
const $$RSC_SERVER_ACTION_2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createServerReference"])("400a18c9a7d32c2174cc981a7b14c4d51b65064595", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["findSourceMapURL"], "sendPasswordResetLink");
;
 //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlU2VydmVyXCI7XG5pbXBvcnQgeyBzdXBhYmFzZUFkbWluIH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlQWRtaW5cIjtcbmltcG9ydCB7IGdldFVybCB9IGZyb20gXCJAL2xpYi91dGlscy9nZXRVcmxcIjtcbmltcG9ydCB7IFJlc2VuZCB9IGZyb20gXCJyZXNlbmRcIjtcbmltcG9ydCB7IHNlbmRTTVMgfSBmcm9tIFwiQC9saWIvc21zXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGxvZ0FjdGl2aXR5IH0gZnJvbSBcIkAvbGliL3V0aWxzL2xvZ0FjdGl2aXR5XCI7XG5cbmNvbnN0IHJlc2VuZCA9IG5ldyBSZXNlbmQocHJvY2Vzcy5lbnYuUkVTRU5EX0FQSV9LRVkhKTtcblxuaW50ZXJmYWNlIEludml0ZURhdGEge1xuICAgIGZ1bGxOYW1lOiBzdHJpbmc7XG4gICAgZW1haWw6IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZztcbiAgICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnZpdGVUZWFtTWVtYmVyKGRhdGE6IEludml0ZURhdGEpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuXG4gICAgaWYgKHVzZXJFcnJvciB8fCAhdXNlckRhdGE/LnVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XG4gICAgfVxuXG4gICAgLy8gR2V0IGNhbGxlcidzIHJvbGVcbiAgICBjb25zdCB7IGRhdGE6IGNhbGxlclByb2ZpbGUgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKFwicHJvZmlsZXNcIilcbiAgICAgICAgLnNlbGVjdChcInJvbGVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlckRhdGEudXNlci5pZClcbiAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgY29uc3QgdG9rZW4gPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICBjb25zdCBkeW5hbWljSG9zdCA9IGF3YWl0IGdldFVybCgpO1xuICAgIGNvbnN0IGludml0ZUxpbmsgPSBgJHtkeW5hbWljSG9zdH0vaW52aXRlP3Rva2VuPSR7dG9rZW59YDtcblxuICAgIGNvbnN0IHsgZXJyb3I6IGluc2VydEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmZyb20oXCJ0ZWFtX2ludml0YXRpb25zXCIpLmluc2VydCh7XG4gICAgICAgIGZ1bGxfbmFtZTogZGF0YS5mdWxsTmFtZSxcbiAgICAgICAgZW1haWw6IGRhdGEuZW1haWwsXG4gICAgICAgIHBob25lOiBkYXRhLnBob25lIHx8IG51bGwsXG4gICAgICAgIHJvbGU6IGRhdGEucm9sZSxcbiAgICAgICAgdG9rZW4sXG4gICAgICAgIGludml0ZWRfYnk6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgfSk7XG5cbiAgICBpZiAoaW5zZXJ0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkludml0ZSBpbnNlcnRpb24gZXJyb3I6XCIsIGluc2VydEVycm9yKTtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZhaWxlZCB0byBjcmVhdGUgaW52aXRhdGlvbiByZWNvcmQuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBMT0cgQUNUSVZJVFlcbiAgICBhd2FpdCBsb2dBY3Rpdml0eSh7XG4gICAgICAgIHVzZXJJZDogdXNlckRhdGEudXNlci5pZCxcbiAgICAgICAgdXNlclJvbGU6IGNhbGxlclByb2ZpbGU/LnJvbGUgfHwgJ2FkbWluJyxcbiAgICAgICAgYWN0aW9uVHlwZTogXCJJTlZJVEVcIixcbiAgICAgICAgcmVzb3VyY2U6IFwidGVhbVwiLFxuICAgICAgICBkZXRhaWxzOiB7IGVtYWlsOiBkYXRhLmVtYWlsLCByb2xlOiBkYXRhLnJvbGUgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IGBZb3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gY29sbGFib3JhdGUgb24gTWlzcyBUb2t5byBhcyBhICR7ZGF0YS5yb2xlfS4gSm9pbiBoZXJlOiAke2ludml0ZUxpbmt9YDtcblxuICAgIC8vIDEuIEZvcm1hdCBQaG9uZSBOdW1iZXIgKEdoYW5hIHN0YW5kYXJkICsyMzMpXG4gICAgbGV0IGZvcm1hdHRlZFBob25lID0gZGF0YS5waG9uZTtcbiAgICBpZiAoZm9ybWF0dGVkUGhvbmUpIHtcbiAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBmb3JtYXR0ZWRQaG9uZS5yZXBsYWNlKC9cXEQvZywgXCJcIik7XG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZS5zdGFydHNXaXRoKFwiMFwiKSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUGhvbmUgPSBcIjIzM1wiICsgZm9ybWF0dGVkUGhvbmUuc2xpY2UoMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWZvcm1hdHRlZFBob25lLnN0YXJ0c1dpdGgoXCIyMzNcIikpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIyMzNcIiArIGZvcm1hdHRlZFBob25lO1xuICAgICAgICB9XG4gICAgICAgIGZvcm1hdHRlZFBob25lID0gXCIrXCIgKyBmb3JtYXR0ZWRQaG9uZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBhd2FpdCByZXNlbmQuZW1haWxzLnNlbmQoe1xuICAgICAgICAgICAgZnJvbTogcHJvY2Vzcy5lbnYuUkVTRU5EX0ZST01fRU1BSUwgfHwgXCJvcmRlcnNAaW5mby5taXNzdG9reW8uc2hvcFwiLFxuICAgICAgICAgICAgdG86IGRhdGEuZW1haWwsXG4gICAgICAgICAgICBzdWJqZWN0OiBcIkludml0YXRpb24gdG8gSm9pbiBNaXNzIFRva3lvIFRlYW1cIixcbiAgICAgICAgICAgIHRleHQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICBodG1sOiBgPHA+WW91IGhhdmUgYmVlbiBpbnZpdGVkIHRvIGNvbGxhYm9yYXRlIG9uIE1pc3MgVG9reW8gYXMgYSA8c3Ryb25nPiR7ZGF0YS5yb2xlfTwvc3Ryb25nPi48L3A+PHA+PGEgaHJlZj1cIiR7aW52aXRlTGlua31cIj5DbGljayBoZXJlIHRvIGFjY2VwdCB5b3VyIGludml0YXRpb248L2E+PC9wPmAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChmb3JtYXR0ZWRQaG9uZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBzZW5kU01TKHsgdG86IGZvcm1hdHRlZFBob25lLCBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoc21zRXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlNNUyBmYWlsZWQsIGJ1dCBlbWFpbCBzZW50OlwiLCBzbXNFcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHdhcm5pbmc6ICdFbWFpbCBzZW50LCBidXQgU01TIGZhaWxlZC4nIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIGludml0ZSBlbWFpbHM6XCIsIGVycik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZpdGF0aW9uIHNhdmVkLCBidXQgZmFpbGVkIHRvIGRpc3BhdGNoIGNvbW11bmljYXRpb25zLlwiIH07XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlVGVhbU1lbWJlcih1c2VySWQ6IHN0cmluZykge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBkYXRhOiB1c2VyRGF0YSwgZXJyb3I6IHVzZXJFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XG5cbiAgICBpZiAodXNlckVycm9yIHx8ICF1c2VyRGF0YT8udXNlcikge1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcbiAgICB9XG5cbiAgICAvLyBDUklUSUNBTCBTRUNVUklUWTogVmVyaWZ5IGNhbGxlciBpcyBhbiBhZG1pbiBvciBvd25lclxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgICAgIFxuICAgIGlmICghY2FsbGVyRGF0YSB8fCAoY2FsbGVyRGF0YS5yb2xlICE9PSAnYWRtaW4nICYmIGNhbGxlckRhdGEucm9sZSAhPT0gJ293bmVyJykpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gcmVtb3ZlIG1lbWJlcnMuXCIgfTtcbiAgICB9XG5cbiAgICAvLyBEZW1vdGUgcm9sZSB0byAnY3VzdG9tZXInIHNvIHRoZXkgbG9zZSBkYXNoYm9hcmQgYWNjZXNzIHdpdGhvdXQgZGVzdHJveWluZ1xuICAgIC8vIHRoZWlyIGFjY291bnQgb3IgdHJpZ2dlcmluZyBGSyBjb25zdHJhaW50IGZhaWx1cmVzIG9uIG9yZGVycy9wb3Nfc2Vzc2lvbnMvbG9ncy5cbiAgICBjb25zdCB7IGVycm9yOiBkZW1vdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgICAuZnJvbShcInByb2ZpbGVzXCIpXG4gICAgICAgIC51cGRhdGUoeyByb2xlOiBcImN1c3RvbWVyXCIgfSlcbiAgICAgICAgLmVxKFwiaWRcIiwgdXNlcklkKTtcblxuICAgIGlmIChkZW1vdGVFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGRlbW90ZSB1c2VyIElEXCIsIHVzZXJJZCwgZGVtb3RlRXJyb3IpO1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRmFpbGVkIHRvIHJlbW92ZSB0ZWFtIG1lbWJlci5cIiB9O1xuICAgIH1cblxuICAgIC8vIEZvcmNlIHNpZ24tb3V0IHNvIHRoZSByZW1vdmVkIG1lbWJlcidzIHNlc3Npb24gZW5kcyBpbW1lZGlhdGVseS5cbiAgICBhd2FpdCBzdXBhYmFzZUFkbWluLmF1dGguYWRtaW4uc2lnbk91dCh1c2VySWQsIFwiZ2xvYmFsXCIpO1xuXG4gICAgLy8gTE9HIEFDVElWSVRZXG4gICAgYXdhaXQgbG9nQWN0aXZpdHkoe1xuICAgICAgICB1c2VySWQ6IHVzZXJEYXRhLnVzZXIuaWQsXG4gICAgICAgIHVzZXJSb2xlOiBjYWxsZXJEYXRhLnJvbGUsXG4gICAgICAgIGFjdGlvblR5cGU6IFwiUkVNT1ZFX01FTUJFUlwiLFxuICAgICAgICByZXNvdXJjZTogXCJ0ZWFtXCIsXG4gICAgICAgIHJlc291cmNlSWQ6IHVzZXJJZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZFBhc3N3b3JkUmVzZXRMaW5rKHRhcmdldEVtYWlsOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YTogdXNlckRhdGEsIGVycm9yOiB1c2VyRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIGlmICh1c2VyRXJyb3IgfHwgIXVzZXJEYXRhPy51c2VyKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcblxuICAgIGNvbnN0IHsgZGF0YTogY2FsbGVyRGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oXCJwcm9maWxlc1wiKVxuICAgICAgICAuc2VsZWN0KFwicm9sZVwiKVxuICAgICAgICAuZXEoXCJpZFwiLCB1c2VyRGF0YS51c2VyLmlkKVxuICAgICAgICAuc2luZ2xlKCk7XG4gICAgaWYgKCFjYWxsZXJEYXRhIHx8IChjYWxsZXJEYXRhLnJvbGUgIT09IFwiYWRtaW5cIiAmJiBjYWxsZXJEYXRhLnJvbGUgIT09IFwib3duZXJcIikpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkZvcmJpZGRlbjogT25seSBhZG1pbnMgYW5kIG93bmVycyBjYW4gc2VuZCByZXNldCBsaW5rcy5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHsgY3JlYXRlQ2xpZW50OiBjcmVhdGVTZXJ2aWNlQ2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIik7XG4gICAgY29uc3QgYWRtaW5DbGllbnQgPSBjcmVhdGVTZXJ2aWNlQ2xpZW50KFxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxuICAgICAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZISxcbiAgICAgICAgeyBhdXRoOiB7IGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLCBwZXJzaXN0U2Vzc2lvbjogZmFsc2UgfSB9XG4gICAgKTtcblxuICAgIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcImh0dHBzOi8vbWlzc3Rva3lvLnNob3BcIjtcblxuICAgIC8vIEZldGNoIGJpeiBuYW1lIHNvIHRoZSBlbWFpbCBoZWFkZXIgbWF0Y2hlcyB0aGUgcmVzdCBvZiB0aGUgc3lzdGVtXG4gICAgY29uc3QgeyBkYXRhOiBiaXogfSA9IGF3YWl0IGFkbWluQ2xpZW50XG4gICAgICAgIC5mcm9tKFwiYnVzaW5lc3Nfc2V0dGluZ3NcIilcbiAgICAgICAgLnNlbGVjdChcImJ1c2luZXNzX25hbWVcIilcbiAgICAgICAgLmVxKFwiaWRcIiwgXCJkZWZhdWx0XCIpXG4gICAgICAgIC5zaW5nbGUoKTtcbiAgICBjb25zdCBiaXpOYW1lID0gKGJpeiBhcyBhbnkpPy5idXNpbmVzc19uYW1lIHx8IFwiTWlzcyBUb2t5b1wiO1xuXG4gICAgY29uc3QgeyBkYXRhOiBsaW5rRGF0YSwgZXJyb3I6IGxpbmtFcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuYXV0aC5hZG1pbi5nZW5lcmF0ZUxpbmsoe1xuICAgICAgICB0eXBlOiBcInJlY292ZXJ5XCIsXG4gICAgICAgIGVtYWlsOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgb3B0aW9uczogeyByZWRpcmVjdFRvOiBgJHtzaXRlVXJsfS9hY2NvdW50L3Jlc2V0LXBhc3N3b3JkYCB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGxpbmtFcnJvciB8fCAhbGlua0RhdGEpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGdlbmVyYXRlTGluayBmYWlsZWQ6XCIsIGxpbmtFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGYWlsZWQgdG8gZ2VuZXJhdGUgcmVzZXQgbGluay5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc2V0TGluayA9IChsaW5rRGF0YSBhcyBhbnkpPy5wcm9wZXJ0aWVzPy5hY3Rpb25fbGluaztcbiAgICBpZiAoIXJlc2V0TGluaykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkNvdWxkIG5vdCByZXRyaWV2ZSByZXNldCBsaW5rLlwiIH07XG5cbiAgICBjb25zdCB7IHNlbmRFbWFpbCB9ID0gYXdhaXQgaW1wb3J0KFwiQC9saWIvZW1haWxcIik7XG4gICAgY29uc3QgeyBvaywgZXJyb3I6IGVtYWlsRXJyb3IgfSA9IGF3YWl0IHNlbmRFbWFpbCh7XG4gICAgICAgIHRvOiB0YXJnZXRFbWFpbCxcbiAgICAgICAgc3ViamVjdDogYFJlc2V0IHlvdXIgJHtiaXpOYW1lfSBwYXNzd29yZGAsXG4gICAgICAgIGh0bWw6IGBcbjwhRE9DVFlQRSBodG1sPlxuPGh0bWw+XG48Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBHZW9yZ2lhLCBzZXJpZjsgYmFja2dyb3VuZDogI2ZhZmFmOTsgbWFyZ2luOiAwOyBwYWRkaW5nOiA0MHB4IDIwcHg7XCI+XG4gIDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDU2MHB4OyBtYXJnaW46IDAgYXV0bzsgYmFja2dyb3VuZDogd2hpdGU7IGJvcmRlcjogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmc6IDQ4cHg7XCI+XG4gICAgPGgxIHN0eWxlPVwiZm9udC1zaXplOiAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBtYXJnaW46IDAgMCA4cHg7XCI+JHtiaXpOYW1lfTwvaDE+XG4gICAgPHAgc3R5bGU9XCJjb2xvcjogIzczNzM3MzsgZm9udC1zaXplOiAxMXB4OyBsZXR0ZXItc3BhY2luZzogMC4yZW07IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IG1hcmdpbjogMCAwIDQwcHg7XCI+UGFzc3dvcmQgUmVzZXQ8L3A+XG5cbiAgICA8aDIgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7IGZvbnQtd2VpZ2h0OiBub3JtYWw7IGNvbG9yOiAjMTcxNzE3OyBtYXJnaW46IDAgMCAyNHB4OyBsZXR0ZXItc3BhY2luZzogMC4wNWVtO1wiPlxuICAgICAgUmVzZXQgeW91ciBwYXNzd29yZFxuICAgIDwvaDI+XG5cbiAgICA8cCBzdHlsZT1cImZvbnQtc2l6ZTogMTRweDsgY29sb3I6ICM1MjUyNTI7IGxpbmUtaGVpZ2h0OiAxLjg7IG1hcmdpbjogMCAwIDMycHg7XCI+XG4gICAgICBBbiBhZG1pbiBoYXMgcmVxdWVzdGVkIGEgcGFzc3dvcmQgcmVzZXQgZm9yIHlvdXIgYWNjb3VudC4gQ2xpY2sgdGhlIGJ1dHRvbiBiZWxvdyB0byBzZXQgYSBuZXcgcGFzc3dvcmQuIFRoaXMgbGluayBleHBpcmVzIGluIDEgaG91ci5cbiAgICA8L3A+XG5cbiAgICA8YSBocmVmPVwiJHtyZXNldExpbmt9XCIgc3R5bGU9XCJkaXNwbGF5OiBibG9jazsgYmFja2dyb3VuZDogIzE3MTcxNzsgY29sb3I6IHdoaXRlOyB0ZXh0LWRlY29yYXRpb246IG5vbmU7IGZvbnQtc2l6ZTogMTBweDsgbGV0dGVyLXNwYWNpbmc6IDAuMmVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBwYWRkaW5nOiAxNnB4IDMycHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC13ZWlnaHQ6IDcwMDsgbWFyZ2luLWJvdHRvbTogMzJweDtcIj5cbiAgICAgIFJlc2V0IE15IFBhc3N3b3JkIOKGklxuICAgIDwvYT5cblxuICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxM3B4OyBjb2xvcjogIzczNzM3MzsgbGluZS1oZWlnaHQ6IDEuODsgbWFyZ2luOiAwIDAgMzJweDtcIj5cbiAgICAgIElmIHlvdSBkaWQgbm90IGV4cGVjdCB0aGlzIGVtYWlsLCB5b3UgY2FuIHNhZmVseSBpZ25vcmUgaXQg4oCUIHlvdXIgYWNjb3VudCByZW1haW5zIHNlY3VyZS5cbiAgICA8L3A+XG5cbiAgICA8ZGl2IHN0eWxlPVwiYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU1ZTU7IHBhZGRpbmctdG9wOiAyNHB4OyBtYXJnaW4tdG9wOiAyNHB4O1wiPlxuICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiAjYTNhM2EzOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzogMC4xNWVtOyBtYXJnaW46IDA7XCI+XG4gICAgICAgICR7Yml6TmFtZX1cbiAgICAgIDwvcD5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YCxcbiAgICB9KTtcblxuICAgIGlmICghb2spIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kUGFzc3dvcmRSZXNldExpbmtdIGVtYWlsIGZhaWxlZDpcIiwgZW1haWxFcnJvcik7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJSZXNldCBsaW5rIGdlbmVyYXRlZCBidXQgZW1haWwgZmFpbGVkIHRvIHNlbmQuXCIgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6ImlUQWtKc0Isa01BQUEifQ==
}),
"[project]/src/app/(dashboard)/settings/TeamTab.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeamTab",
    ()=>TeamTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.js [app-ssr] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-plus.js [app-ssr] (ecmascript) <export default as UserPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key-round.js [app-ssr] (ecmascript) <export default as KeyRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$7b9476__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/data:7b9476 [app-ssr] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$77941c__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/data:77941c [app-ssr] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$0b49c5__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/data:0b49c5 [app-ssr] (ecmascript) <text/javascript>");
"use client";
;
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
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("members");
    const [members, setMembers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [invites, setInvites] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [logs, setLogs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [showModal, setShowModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [inviteEmail, setInviteEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [inviteName, setInviteName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [invitePhone, setInvitePhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [inviteRole, setInviteRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("sales_staff");
    const [inviting, setInviting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Filter states
    const [filterUserId, setFilterUserId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("all");
    const [filterAction, setFilterAction] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("all");
    const [filterDate, setFilterDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Date().toISOString().split('T')[0]);
    const [allStaff, setAllStaff] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // Pagination states
    const [page, setPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [hasMore, setHasMore] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const PAGE_SIZE = 50;
    const fetchData = async (isLoadMore = false)=>{
        if (!isLoadMore) setLoading(true);
        if (activeTab === "members") {
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("profiles").select("id, email, full_name, role, created_at").in("role", DASHBOARD_ROLES).order("created_at", {
                ascending: true
            });
            if (data) {
                setMembers(data);
            }
        } else if (activeTab === "pending") {
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("team_invitations").select("*").eq("status", "pending").order("created_at", {
                ascending: false
            });
            if (data) setInvites(data);
        } else if (activeTab === "logs") {
            const startOfDay = `${filterDate}T00:00:00.000Z`;
            const endOfDay = `${filterDate}T23:59:59.999Z`;
            let query = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("activity_logs").select("*, profiles(full_name, email)").gte("created_at", startOfDay).lte("created_at", endOfDay).order("created_at", {
                ascending: false
            }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
            if (filterUserId !== "all") {
                query = query.eq("user_id", filterUserId);
            }
            if (filterAction !== "all") {
                query = query.eq("action_type", filterAction);
            }
            const { data } = await query;
            if (data) {
                if (isLoadMore) {
                    setLogs((prev)=>[
                            ...prev,
                            ...data
                        ]);
                } else {
                    setLogs(data);
                }
                setHasMore(data.length === PAGE_SIZE);
            }
        }
        if (!isLoadMore) setLoading(false);
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setPage(0); // Reset page on filter change
        fetchData();
    }, [
        activeTab,
        filterUserId,
        filterAction,
        filterDate
    ]);
    // Handle Load More
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (page > 0) {
            fetchData(true);
        }
    }, [
        page
    ]);
    // Fetch staff list for logs filter — dashboard roles only, independent of active tab
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const fetchStaff = async ()=>{
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("profiles").select("id, full_name, email, role").in("role", DASHBOARD_ROLES).order("full_name", {
                ascending: true
            });
            if (data) {
                setAllStaff(data.map((d)=>({
                        id: d.id,
                        full_name: d.full_name || d.email
                    })));
            }
        };
        fetchStaff();
    }, []); // empty deps — runs once on mount
    const handleInvite = async (e)=>{
        e.preventDefault();
        setInviting(true);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$7b9476__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["inviteTeamMember"])({
                fullName: inviteName,
                email: inviteEmail,
                phone: invitePhone || undefined,
                role: inviteRole
            });
            if (!res.success) {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(res.error || "Invite failed");
            } else {
                if (res.warning) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(res.warning); // the custom toast component maps this as an error/alert visually
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`Invitation sent to ${inviteEmail}`);
                }
                setShowModal(false);
                setInviteEmail("");
                setInviteName("");
                setInvitePhone("");
                if (activeTab === "pending") fetchData();
            }
        } catch (err) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("An unexpected error occurred while sending the invite.");
            console.error(err);
        } finally{
            setInviting(false);
        }
    };
    const handleRevoke = async (id, email)=>{
        if (!confirm(`Revoke invitation for ${email}?`)) return;
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("team_invitations").update({
            status: "revoked"
        }).eq("id", id);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to revoke invite.");
            return;
        }
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Invitation revoked.");
        fetchData();
    };
    const [removingId, setRemovingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sendingResetId, setSendingResetId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const handleSendReset = async (member)=>{
        if (!confirm(`Send a password reset link to ${member.email}?`)) return;
        setSendingResetId(member.id);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$0b49c5__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["sendPasswordResetLink"])(member.email);
            if (!res.success) {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(res.error || "Failed to send reset link.");
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`Reset link sent to ${member.email}.`);
            }
        } catch  {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("An unexpected error occurred.");
        } finally{
            setSendingResetId(null);
        }
    };
    const handleRemove = async (member)=>{
        if (member.role === "owner" || member.role === "admin") {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Admin and owner accounts cannot be removed.");
            return;
        }
        if (!confirm(`Remove ${member.email} from the team? They will lose dashboard access.`)) return;
        setRemovingId(member.id);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$data$3a$77941c__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["removeTeamMember"])(member.id);
            if (!res.success) {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(res.error || "Failed to remove member.");
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Team member removed.");
                router.refresh();
                fetchData();
            }
        } catch (err) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("An unexpected error occurred.");
            console.error(err);
        } finally{
            setRemovingId(null);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8 max-w-5xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveTab("members"),
                                className: `text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'members' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`,
                                children: "Active Members"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 258,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveTab("pending"),
                                className: `text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'pending' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`,
                                children: "Pending Invites"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 264,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveTab("logs"),
                                className: `text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'logs' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`,
                                children: "Activity Logs"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 270,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 257,
                        columnNumber: 17
                    }, this),
                    (activeTab === "members" || activeTab === "pending") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setShowModal(true),
                        className: "flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] md:text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-lg whitespace-nowrap",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 283,
                                columnNumber: 25
                            }, this),
                            "Invite Member"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 279,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                lineNumber: 256,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden",
                children: [
                    activeTab === "members" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "px-8 py-10 text-neutral-400 italic",
                            children: "Loading active members..."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 296,
                            columnNumber: 29
                        }, this) : members.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "px-8 py-10 text-neutral-400 italic",
                            children: "No team members yet."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 298,
                            columnNumber: 29
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full text-left bg-white",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    className: "bg-neutral-50 border-b border-neutral-100",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "User"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 303,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Role"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 304,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Joined"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 305,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-right"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 306,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 302,
                                        columnNumber: 37
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 301,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    className: "divide-y divide-neutral-50 text-sm",
                                    children: members.map((member)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            className: "hover:bg-neutral-50 transition-colors",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "font-semibold text-neutral-900",
                                                            children: member.full_name || "—"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 313,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-[11px] text-neutral-500 font-mono tracking-tight mt-0.5",
                                                            children: member.email
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 314,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 312,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md ${ROLE_COLORS[member.role] || "bg-neutral-100 text-neutral-700"}`,
                                                        children: ROLE_LABELS[member.role] || member.role
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 317,
                                                        columnNumber: 49
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 316,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-neutral-500 text-[11px]",
                                                    children: new Date(member.created_at).toLocaleDateString()
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 321,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-right",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-end gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleSendReset(member),
                                                                disabled: sendingResetId === member.id,
                                                                title: "Send password reset link",
                                                                className: "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-black transition-colors disabled:opacity-50",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__["KeyRound"], {
                                                                        size: 12
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 332,
                                                                        columnNumber: 57
                                                                    }, this),
                                                                    sendingResetId === member.id ? "Sending..." : "Reset"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 326,
                                                                columnNumber: 53
                                                            }, this),
                                                            member.role !== "owner" && member.role !== "admin" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleRemove(member),
                                                                disabled: removingId === member.id,
                                                                className: "text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50",
                                                                children: removingId === member.id ? "Removing..." : "Remove"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 336,
                                                                columnNumber: 57
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 325,
                                                        columnNumber: 49
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 324,
                                                    columnNumber: 45
                                                }, this)
                                            ]
                                        }, member.id, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 311,
                                            columnNumber: 41
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 309,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 300,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 294,
                        columnNumber: 21
                    }, this),
                    activeTab === "pending" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "px-8 py-10 text-neutral-400 italic",
                            children: "Loading pending invitations..."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 358,
                            columnNumber: 29
                        }, this) : invites.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "px-8 py-10 text-neutral-400 italic",
                            children: "No pending invitations."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 360,
                            columnNumber: 29
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full text-left bg-white",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    className: "bg-neutral-50 border-b border-neutral-100",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Invitee"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 365,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Role"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 366,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                children: "Sent on"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 367,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400 text-right",
                                                children: "Actions"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 368,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 364,
                                        columnNumber: 37
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 363,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    className: "divide-y divide-neutral-50 text-sm",
                                    children: invites.map((invite)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            className: "hover:bg-neutral-50 transition-colors",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "font-semibold text-neutral-900 flex items-center gap-2",
                                                            children: [
                                                                invite.full_name,
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "flex h-1.5 w-1.5 rounded-full bg-amber-400"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                    lineNumber: 377,
                                                                    columnNumber: 53
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 375,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-[11px] text-neutral-500 font-mono tracking-tight mt-0.5",
                                                            children: invite.email
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 379,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 374,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md ${ROLE_COLORS[invite.role] || "bg-neutral-100 text-neutral-700"}`,
                                                        children: ROLE_LABELS[invite.role] || invite.role
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 382,
                                                        columnNumber: 49
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 381,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-neutral-500 text-[11px]",
                                                    children: new Date(invite.created_at).toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 386,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 text-right",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>handleRevoke(invite.id, invite.email),
                                                        className: "text-[10px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors bg-rose-50 px-3 py-1.5 rounded-md",
                                                        children: "Revoke"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 390,
                                                        columnNumber: 49
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 389,
                                                    columnNumber: 45
                                                }, this)
                                            ]
                                        }, invite.id, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 373,
                                            columnNumber: 41
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 371,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 362,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 356,
                        columnNumber: 21
                    }, this),
                    activeTab === "logs" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-8 py-4 bg-neutral-50 border-b border-neutral-100 flex flex-wrap items-center gap-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400",
                                                children: "Date:"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 411,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "date",
                                                value: filterDate,
                                                onChange: (e)=>setFilterDate(e.target.value),
                                                className: "bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 412,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 410,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400",
                                                children: "Staff:"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 420,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                value: filterUserId,
                                                onChange: (e)=>setFilterUserId(e.target.value),
                                                className: "bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "all",
                                                        children: "All Members"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 426,
                                                        columnNumber: 37
                                                    }, this),
                                                    allStaff.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: s.id,
                                                            children: s.full_name
                                                        }, s.id, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 428,
                                                            columnNumber: 41
                                                        }, this))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 421,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 419,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400",
                                                children: "Action:"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 433,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                value: filterAction,
                                                onChange: (e)=>setFilterAction(e.target.value),
                                                className: "bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "all",
                                                        children: "All Actions"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 439,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "CREATE",
                                                        children: "Created"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 440,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "UPDATE",
                                                        children: "Updated"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 441,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "DELETE",
                                                        children: "Deleted"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 442,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "PACKED_ORDER",
                                                        children: "Packed"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 443,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "DISPATCHED_ORDER",
                                                        children: "Dispatched"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 444,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "DELIVERED_ORDER",
                                                        children: "Delivered"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 445,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "ASSIGNED_RIDER",
                                                        children: "Rider Assigned"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 446,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "INVITE",
                                                        children: "Invited"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 447,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "REMOVE_MEMBER",
                                                        children: "Removed"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 448,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 434,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 432,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            setFilterUserId("all");
                                            setFilterAction("all");
                                            setFilterDate(new Date().toISOString().split('T')[0]);
                                        },
                                        className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-black transition-colors",
                                        children: "Reset Filters"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 451,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 409,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto",
                                children: [
                                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "px-8 py-10 text-neutral-400 italic",
                                        children: "Updating log view..."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 465,
                                        columnNumber: 33
                                    }, this) : logs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "px-8 py-10 text-neutral-400 italic",
                                        children: "No logs found matching your criteria."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 467,
                                        columnNumber: 33
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                        className: "w-full text-left bg-white",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                className: "bg-neutral-50/50 border-b border-neutral-100",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                            children: "Timestamp"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 472,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                            children: "Staff Member"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 473,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                            children: "Action"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 474,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400",
                                                            children: "Details"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                            lineNumber: 475,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 471,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 470,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                className: "divide-y divide-neutral-50 text-sm",
                                                children: logs.map((log)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: "hover:bg-neutral-50 transition-colors align-top",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-6 py-4 text-neutral-500 text-[11px] whitespace-nowrap",
                                                                children: new Date(log.created_at).toLocaleString('en-GB', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 481,
                                                                columnNumber: 49
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-6 py-4 whitespace-nowrap",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "font-semibold text-neutral-900",
                                                                        children: log.profiles?.full_name || "Unknown"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 485,
                                                                        columnNumber: 53
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5",
                                                                        children: ROLE_LABELS[log.user_role] || log.user_role
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 486,
                                                                        columnNumber: 53
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 484,
                                                                columnNumber: 49
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-6 py-4 whitespace-nowrap",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `font-mono text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${log.action_type === 'CREATE' ? 'bg-green-50 text-green-700' : log.action_type === 'DELETE' ? 'bg-red-50 text-red-700' : log.action_type === 'UPDATE' ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-700'}`,
                                                                    children: log.action_type
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                    lineNumber: 489,
                                                                    columnNumber: 53
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 488,
                                                                columnNumber: 49
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-6 py-4 min-w-[300px]",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "flex items-center gap-1.5 mb-1.5",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-[10px] uppercase tracking-widest font-bold text-neutral-400",
                                                                                children: [
                                                                                    log.resource,
                                                                                    ":"
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                lineNumber: 500,
                                                                                columnNumber: 57
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-medium text-neutral-900",
                                                                                children: log.action_type === 'PACKED_ORDER' ? `Packed Order #${log.details?.order_number}` : log.action_type === 'ASSIGNED_RIDER' ? `Assigned Order #${log.details?.order_number} to ${log.details?.rider_name || 'Rider'}` : log.action_type === 'DISPATCHED_ORDER' ? `Dispatched Order #${log.details?.order_number}` : log.action_type === 'DELIVERED_ORDER' ? `Delivered Order #${log.details?.order_number}` : log.details?.resource_name || "—"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                lineNumber: 501,
                                                                                columnNumber: 57
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 499,
                                                                        columnNumber: 53
                                                                    }, this),
                                                                    ![
                                                                        'PACKED_ORDER',
                                                                        'ASSIGNED_RIDER',
                                                                        'DISPATCHED_ORDER',
                                                                        'DELIVERED_ORDER'
                                                                    ].includes(log.action_type) && log.details?.changes && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "space-y-1.5 mt-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100",
                                                                        children: Object.entries(log.details.changes).map(([field, delta])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "text-[11px] flex flex-wrap items-center gap-x-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "font-semibold text-neutral-500 capitalize",
                                                                                        children: [
                                                                                            field.replace(/_/g, ' '),
                                                                                            ":"
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                        lineNumber: 514,
                                                                                        columnNumber: 69
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-red-500 line-through decoration-red-300 opacity-60",
                                                                                        children: typeof delta.from === 'object' ? 'Data' : String(delta.from ?? 'null')
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                        lineNumber: 515,
                                                                                        columnNumber: 69
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-neutral-400",
                                                                                        children: "→"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                        lineNumber: 518,
                                                                                        columnNumber: 69
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-green-600 font-medium",
                                                                                        children: typeof delta.to === 'object' ? 'Data' : String(delta.to ?? 'null')
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                        lineNumber: 519,
                                                                                        columnNumber: 69
                                                                                    }, this)
                                                                                ]
                                                                            }, field, true, {
                                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                lineNumber: 513,
                                                                                columnNumber: 65
                                                                            }, this))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 511,
                                                                        columnNumber: 57
                                                                    }, this),
                                                                    [
                                                                        'PACKED_ORDER',
                                                                        'ASSIGNED_RIDER',
                                                                        'DISPATCHED_ORDER',
                                                                        'DELIVERED_ORDER'
                                                                    ].includes(log.action_type) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[11px] text-neutral-500 mt-1",
                                                                        children: [
                                                                            "Status: ",
                                                                            log.details?.previous_status,
                                                                            " → ",
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-green-600 font-semibold",
                                                                                children: log.details?.new_status
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                                lineNumber: 529,
                                                                                columnNumber: 102
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                        lineNumber: 528,
                                                                        columnNumber: 57
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                                lineNumber: 498,
                                                                columnNumber: 49
                                                            }, this)
                                                        ]
                                                    }, log.id, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                        lineNumber: 480,
                                                        columnNumber: 45
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                lineNumber: 478,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 469,
                                        columnNumber: 33
                                    }, this),
                                    hasMore && logs.length >= PAGE_SIZE && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-6 border-t border-neutral-50 flex justify-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setPage((prev)=>prev + 1),
                                            className: "px-6 py-2 border border-neutral-200 text-[10px] uppercase tracking-widest font-semibold hover:bg-neutral-50 transition-colors rounded-lg",
                                            children: "Load More"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 541,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 540,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                lineNumber: 463,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                        lineNumber: 407,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                lineNumber: 290,
                columnNumber: 13
            }, this),
            showModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white w-full max-w-md rounded-2xl border border-neutral-200 shadow-2xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-8 py-5 border-b border-neutral-100 flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "font-serif text-lg tracking-widest uppercase",
                                    children: "Invite New Member"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 559,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setShowModal(false),
                                    className: "text-neutral-400 hover:text-black",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                        lineNumber: 561,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 560,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 558,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleInvite,
                            className: "p-8 space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Full Name"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 566,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            required: true,
                                            value: inviteName,
                                            onChange: (e)=>setInviteName(e.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                            placeholder: "Ama Staff"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 567,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 565,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Email Address"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 577,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "email",
                                            required: true,
                                            value: inviteEmail,
                                            onChange: (e)=>setInviteEmail(e.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                            placeholder: "ama@misstokyo.com"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 578,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 576,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Phone Number (Optional)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 588,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: invitePhone,
                                            onChange: (e)=>setInvitePhone(e.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                            placeholder: "+233..."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 589,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 587,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                            children: "Role Assignment"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 598,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: inviteRole,
                                            onChange: (e)=>setInviteRole(e.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors cursor-pointer appearance-none",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "sales_staff",
                                                    children: "Sales Staff"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 604,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "admin",
                                                    children: "Admin"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 605,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "owner",
                                                    children: "Owner"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 606,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 599,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 597,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3 pt-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setShowModal(false),
                                            className: "flex-1 py-3 border border-neutral-200 text-xs uppercase tracking-widest hover:bg-neutral-50 transition-colors rounded-lg",
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 610,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: inviting,
                                            className: "flex-1 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                                    size: 12
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                                    lineNumber: 622,
                                                    columnNumber: 37
                                                }, this),
                                                inviting ? "Sending..." : "Send Invite"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                            lineNumber: 617,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                                    lineNumber: 609,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                            lineNumber: 564,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                    lineNumber: 557,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
                lineNumber: 556,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/TeamTab.tsx",
        lineNumber: 254,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BusinessSettingsTab",
    ()=>BusinessSettingsTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
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
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").select("*").eq("id", "singleton").single().then(({ data })=>{
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
        });
    }, []);
    const set = (key, value)=>setForm((prev)=>({
                ...prev,
                [key]: value
            }));
    const handleSave = async ()=>{
        setSaving(true);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").upsert({
            id: "singleton",
            ...form
        }, {
            onConflict: "id"
        });
        setSaving(false);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to save settings");
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Settings saved");
        }
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-neutral-400 italic font-serif",
            children: "Loading..."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
            lineNumber: 112,
            columnNumber: 13
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8 max-w-3xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                        children: "Store Information"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 120,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: LABEL_CLASS,
                                children: "Store Name"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 125,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                value: form.store_name,
                                onChange: (e)=>set("store_name", e.target.value),
                                className: INPUT_CLASS,
                                placeholder: "Miss Tokyo"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 126,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 124,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: LABEL_CLASS,
                                children: [
                                    "Tagline",
                                    " ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-neutral-400 normal-case tracking-normal",
                                        children: "(max 160 chars)"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                        lineNumber: 138,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 136,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                rows: 2,
                                maxLength: 160,
                                value: form.store_tagline,
                                onChange: (e)=>set("store_tagline", e.target.value),
                                className: INPUT_CLASS + " resize-none",
                                placeholder: "Luxury footwear crafted for you."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 142,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-neutral-400 mt-1",
                                children: [
                                    form.store_tagline.length,
                                    " / 160"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 150,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 135,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: LABEL_CLASS,
                                children: "Store Email"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 156,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "email",
                                value: form.store_email,
                                onChange: (e)=>set("store_email", e.target.value),
                                className: INPUT_CLASS,
                                placeholder: "hello@misstokyo.com"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 157,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 155,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: LABEL_CLASS,
                                children: "Phone"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 167,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                value: form.store_phone,
                                onChange: (e)=>set("store_phone", e.target.value),
                                className: INPUT_CLASS,
                                placeholder: "+234 800 000 0000"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 168,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 166,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: LABEL_CLASS,
                                children: "Address"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 178,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                rows: 3,
                                value: form.store_address,
                                onChange: (e)=>set("store_address", e.target.value),
                                className: INPUT_CLASS + " resize-none",
                                placeholder: "123 Victoria Island, Lagos, Nigeria"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 179,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 177,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                lineNumber: 119,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                        children: "Social Links"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 191,
                        columnNumber: 17
                    }, this),
                    SOCIAL_PLATFORMS.map(({ key, label })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500 w-28 shrink-0",
                                    children: label
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                    lineNumber: 196,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "url",
                                    value: form[key],
                                    onChange: (e)=>set(key, e.target.value),
                                    className: INPUT_CLASS,
                                    placeholder: `https://`
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                    lineNumber: 199,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, key, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                            lineNumber: 195,
                            columnNumber: 21
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                lineNumber: 190,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border border-neutral-200 p-6 space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                        children: "Instagram Feed"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 212,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: LABEL_CLASS,
                                children: "Access Token"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 216,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                value: form.instagram_access_token,
                                onChange: (e)=>set("instagram_access_token", e.target.value),
                                className: INPUT_CLASS,
                                placeholder: "IGQVJXb..."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 217,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-neutral-400 mt-2 leading-relaxed",
                                children: "Required to show your live Instagram feed on the homepage. Generate this from the Instagram Basic Display API. Leave blank to show placeholder tiles."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                                lineNumber: 226,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                        lineNumber: 215,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                lineNumber: 211,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-end",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: handleSave,
                    disabled: saving,
                    className: "px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                    children: saving ? "Saving..." : "Save Settings"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                    lineNumber: 235,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
                lineNumber: 234,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx",
        lineNumber: 117,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/ShippingTab.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ShippingTab",
    ()=>ShippingTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
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
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_FORM);
    const [storeAddress, setStoreAddress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [storePhone, setStorePhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showMore, setShowMore] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const textareaRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("business_settings").select("address, contact").eq("id", "default").single()
        ]).then(([{ data: ss }, { data: biz }])=>{
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
        });
    }, []);
    // Auto-resize textarea
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
        const minH = lineHeight * 4;
        const maxH = lineHeight * 8;
        el.style.height = `${Math.min(maxH, Math.max(minH, el.scrollHeight))}px`;
    }, [
        form.pickup_instructions
    ]);
    const handleSave = async ()=>{
        setSaving(true);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").upsert({
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
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to save pickup settings.");
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Pickup settings saved.");
        }
    };
    const previewAddress = form.pickup_address || storeAddress || "—";
    const previewPhone = form.pickup_contact_phone || storePhone || "—";
    const charCount = form.pickup_instructions.length;
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-neutral-400 italic font-serif py-8",
        children: "Loading..."
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
        lineNumber: 94,
        columnNumber: 25
    }, this);
    const disabled = !form.pickup_enabled;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8 max-w-4xl",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border border-neutral-200 p-8 space-y-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                    children: "Store Pickup"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 102,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex items-center gap-3 cursor-pointer",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    role: "switch",
                                    "aria-checked": form.pickup_enabled,
                                    onClick: ()=>setForm((p)=>({
                                                ...p,
                                                pickup_enabled: !p.pickup_enabled
                                            })),
                                    className: `relative w-10 h-5 rounded-full transition-colors ${form.pickup_enabled ? "bg-black" : "bg-neutral-300"}`,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.pickup_enabled ? "translate-x-5" : "translate-x-0"}`
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                        lineNumber: 114,
                                        columnNumber: 29
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 107,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-700",
                                    children: "Enable store pickup option at checkout"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 116,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                            lineNumber: 106,
                            columnNumber: 21
                        }, this),
                        !form.pickup_enabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-2 ml-[52px] text-[10px] uppercase tracking-widest text-amber-600",
                            children: "Store pickup is disabled. Customers will not see this option at checkout."
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                            lineNumber: 121,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 105,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: `space-y-6 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Pickup Instructions"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 132,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    ref: textareaRef,
                                    value: form.pickup_instructions,
                                    onChange: (e)=>{
                                        if (e.target.value.length <= MAX_CHARS) {
                                            setForm((p)=>({
                                                    ...p,
                                                    pickup_instructions: e.target.value
                                                }));
                                        }
                                    },
                                    rows: 4,
                                    className: "w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black transition-colors resize-none text-sm leading-relaxed",
                                    placeholder: DEFAULT_INSTRUCTIONS,
                                    style: {
                                        whiteSpace: "pre-wrap"
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 135,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start justify-between mt-1 gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] text-neutral-400 tracking-wider",
                                            children: "This text appears verbatim in pickup order emails and receipts."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                            lineNumber: 149,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: `text-[10px] tracking-wider shrink-0 ${charCount > MAX_CHARS * 0.9 ? "text-amber-600" : "text-neutral-400"}`,
                                            children: [
                                                charCount,
                                                " / ",
                                                MAX_CHARS
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                            lineNumber: 152,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 148,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                            lineNumber: 131,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: [
                                        "Pickup Address ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-normal normal-case tracking-normal text-neutral-400",
                                            children: "(optional)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                            lineNumber: 161,
                                            columnNumber: 44
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 160,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: form.pickup_address,
                                    onChange: (e)=>setForm((p)=>({
                                                ...p,
                                                pickup_address: e.target.value
                                            })),
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                    placeholder: "Leave blank to use your store address"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 163,
                                    columnNumber: 25
                                }, this),
                                !form.pickup_address && storeAddress && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-neutral-400 mt-1 tracking-wider",
                                    children: [
                                        "Using store address: ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-neutral-600",
                                            children: storeAddress
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                            lineNumber: 172,
                                            columnNumber: 54
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 171,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                            lineNumber: 159,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: [
                                        "Pickup Contact Number ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-normal normal-case tracking-normal text-neutral-400",
                                            children: "(optional)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                            lineNumber: 180,
                                            columnNumber: 51
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 179,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: form.pickup_contact_phone,
                                    onChange: (e)=>setForm((p)=>({
                                                ...p,
                                                pickup_contact_phone: e.target.value
                                            })),
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                    placeholder: "Leave blank to use your store phone number"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 182,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                            lineNumber: 178,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Estimated Pickup Ready Time"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 193,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: form.pickup_estimated_wait,
                                    onChange: (e)=>setForm((p)=>({
                                                ...p,
                                                pickup_estimated_wait: e.target.value
                                            })),
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                    placeholder: "e.g. 24 hours, Same day, 1–2 business days"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 196,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-neutral-400 mt-1 tracking-wider",
                                    children: "Shown to customers after placing a pickup order."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 203,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                            lineNumber: 192,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-3",
                                    children: "Preview — How it appears in emails & receipts"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 208,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        backgroundColor: "#F7F2EC",
                                        padding: "20px",
                                        borderRadius: "2px",
                                        border: "1px solid #E8E4DE"
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                                            lineNumber: 210,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            style: {
                                                fontSize: "13px",
                                                lineHeight: 1.7,
                                                color: "#404040",
                                                whiteSpace: "pre-wrap",
                                                marginBottom: "16px"
                                            },
                                            children: form.pickup_instructions || DEFAULT_INSTRUCTIONS
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                            lineNumber: 213,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                borderTop: "1px solid #DDD8D1",
                                                paddingTop: "12px",
                                                fontSize: "12px",
                                                color: "#525252",
                                                lineHeight: 2
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        "📍 ",
                                                        previewAddress
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                                    lineNumber: 217,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        "📞 ",
                                                        previewPhone
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                                    lineNumber: 218,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        "⏱ Ready in: ",
                                                        form.pickup_estimated_wait || "24 hours"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                                    lineNumber: 219,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                            lineNumber: 216,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                                    lineNumber: 209,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                            lineNumber: 207,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 128,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-end pt-2 border-t border-neutral-100",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: handleSave,
                        disabled: saving,
                        className: "px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                        children: saving ? "Saving..." : "Save Pickup Settings"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                        lineNumber: 227,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
                    lineNumber: 226,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
            lineNumber: 101,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/ShippingTab.tsx",
        lineNumber: 99,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/ProductPageTab.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProductPageTab",
    ()=>ProductPageTab
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
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
function Toggle({ checked, onChange, label, description }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-between py-4 border-b border-neutral-100",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 pr-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm font-medium text-neutral-800",
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                        lineNumber: 37,
                        columnNumber: 17
                    }, this),
                    description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-neutral-400 mt-0.5 leading-snug",
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                        lineNumber: 39,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                lineNumber: 36,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                role: "switch",
                "aria-checked": checked,
                onClick: ()=>onChange(!checked),
                className: `relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? "bg-black" : "bg-neutral-200"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: `pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-4" : "translate-x-0"}`
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                    lineNumber: 51,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                lineNumber: 42,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
        lineNumber: 35,
        columnNumber: 9
    }, this);
}
function ProductPageTab() {
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULTS);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").select("pdp_show_trust_strip, pdp_show_reviews, pdp_show_product_details, pdp_show_care_instructions, pdp_show_delivery_returns").eq("id", "singleton").single().then(({ data })=>{
            if (data) setSettings({
                ...DEFAULTS,
                ...data
            });
            setLoading(false);
        });
    }, []);
    const set = (key, val)=>setSettings((s)=>({
                ...s,
                [key]: val
            }));
    const save = async ()=>{
        setSaving(true);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_settings").update(settings).eq("id", "singleton");
        setSaving(false);
        if (error) __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to save: " + error.message);
        else __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Product page settings saved");
    };
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-sm text-neutral-400",
        children: "Loading…"
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
        lineNumber: 92,
        columnNumber: 25
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-xs font-semibold uppercase tracking-widest mb-1",
                        children: "Product Page Sections"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                        lineNumber: 97,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-neutral-500 mb-6",
                        children: "Control which sections are visible on every product detail page. Changes take effect after the next deployment or within 60 seconds via ISR."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                        lineNumber: 100,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border border-neutral-200 rounded-lg px-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                checked: settings.pdp_show_trust_strip,
                                onChange: (v)=>set("pdp_show_trust_strip", v),
                                label: "Trust Strip",
                                description: "Free Delivery / Easy Returns / Secure Payment icons below the CTA buttons."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                                lineNumber: 106,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                checked: settings.pdp_show_product_details,
                                onChange: (v)=>set("pdp_show_product_details", v),
                                label: "Product Details accordion",
                                description: "Expandable section showing the product description and features list."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                                lineNumber: 112,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                checked: settings.pdp_show_care_instructions,
                                onChange: (v)=>set("pdp_show_care_instructions", v),
                                label: "Care Instructions accordion",
                                description: "Expandable section with washing and care guidance."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                                lineNumber: 118,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                checked: settings.pdp_show_delivery_returns,
                                onChange: (v)=>set("pdp_show_delivery_returns", v),
                                label: "Delivery & Returns accordion",
                                description: "Expandable section with delivery times, free-delivery threshold, and return policy."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                                lineNumber: 124,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                checked: settings.pdp_show_reviews,
                                onChange: (v)=>set("pdp_show_reviews", v),
                                label: "Customer Reviews section",
                                description: "Rating summary bars and review cards at the bottom of the page."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                                lineNumber: 130,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                        lineNumber: 105,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                lineNumber: 96,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: save,
                disabled: saving,
                className: "px-5 py-2 bg-black text-white text-xs font-semibold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                children: saving ? "Saving…" : "Save Settings"
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
                lineNumber: 139,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/ProductPageTab.tsx",
        lineNumber: 95,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/settings/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SettingsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/ImageUploader.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TagInput$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/TagInput.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$EmailsTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/EmailsTab.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$NotificationsTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/NotificationsTab.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$RidersTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/RidersTab.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$SizeGuideTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/SizeGuideTab.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$TeamTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/TeamTab.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$BusinessSettingsTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/BusinessSettingsTab.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$ShippingTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/ShippingTab.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$ProductPageTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/ProductPageTab.tsx [app-ssr] (ecmascript)");
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
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("business");
    const tabs = [
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "max-w-7xl mx-auto px-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-[20px] font-medium text-neutral-900 tracking-tight font-serif uppercase tracking-widest",
                        children: "Settings"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 128,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-neutral-500 mt-1 uppercase tracking-wider",
                        children: "Business details, store configuration, and operations."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 129,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 127,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex overflow-x-auto border-b border-neutral-200 hide-scrollbar mb-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                    className: "flex gap-8",
                    children: tabs.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setActiveTab(tab.key),
                            className: `whitespace-nowrap pb-4 px-1 border-b-2 text-xs uppercase tracking-widest font-semibold transition-all ${activeTab === tab.key ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-neutral-600"}`,
                            children: tab.label
                        }, tab.key, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 136,
                            columnNumber: 25
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 134,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 133,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full",
                children: [
                    activeTab === "business" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BusinessTab, {}, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 152,
                                columnNumber: 48
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-8",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$BusinessSettingsTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BusinessSettingsTab"], {}, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 152,
                                    columnNumber: 85
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 152,
                                columnNumber: 63
                            }, this)
                        ]
                    }, void 0, true),
                    activeTab === "store" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StoreTab, {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 153,
                        columnNumber: 43
                    }, this),
                    activeTab === "shipping" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$ShippingTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ShippingTab"], {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 154,
                        columnNumber: 46
                    }, this),
                    activeTab === "seo" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SEOTab, {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 155,
                        columnNumber: 41
                    }, this),
                    activeTab === "emails" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$EmailsTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EmailsTab"], {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 156,
                        columnNumber: 44
                    }, this),
                    activeTab === "notifications" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$NotificationsTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NotificationsTab"], {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 157,
                        columnNumber: 51
                    }, this),
                    activeTab === "riders" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$RidersTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RidersTab"], {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 158,
                        columnNumber: 44
                    }, this),
                    activeTab === "size-guide" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$SizeGuideTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SizeGuideTab"], {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 159,
                        columnNumber: 48
                    }, this),
                    activeTab === "team" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$TeamTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TeamTab"], {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 160,
                        columnNumber: 42
                    }, this),
                    activeTab === "product-page" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$ProductPageTab$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProductPageTab"], {}, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 161,
                        columnNumber: 50
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 151,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
        lineNumber: 126,
        columnNumber: 9
    }, this);
}
function BusinessTab() {
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_BUSINESS);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("business_settings").select("*").eq("id", "default").single().then(({ data: bData })=>{
            setForm({
                business_name: bData?.business_name || "",
                email: bData?.email || "",
                contact: bData?.contact || "",
                address: bData?.address || "",
                logo_url: bData?.logo_url || null,
                tax_rate: Number(bData?.tax_rate) || 0
            });
            setLoading(false);
        });
    }, []);
    const handleChange = (e)=>{
        setForm((prev)=>({
                ...prev,
                [e.target.name]: e.target.value
            }));
    };
    const handleSave = async (e)=>{
        e.preventDefault();
        setSaving(true);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("business_settings").upsert({
            id: "default",
            ...form,
            tax_rate: Number(form.tax_rate),
            updated_at: new Date().toISOString()
        }, {
            onConflict: "id"
        });
        setSaving(false);
        setSaved(true);
        setTimeout(()=>setSaved(false), 3000);
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-neutral-400 italic font-serif",
            children: "Loading..."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 205,
            columnNumber: 16
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        onSubmit: handleSave,
        className: "space-y-8",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white border border-neutral-200 p-8 space-y-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                            children: "Brand"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 213,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ImageUploader"], {
                            bucket: "site-assets",
                            folder: "logos",
                            currentUrl: form.logo_url,
                            onUpload: (url)=>setForm((p)=>({
                                        ...p,
                                        logo_url: url
                                    })),
                            aspectRatio: "square",
                            label: "Business Logo"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 214,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Tax Rate (%)"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 223,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                                    lineNumber: 224,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-neutral-400 mt-1 tracking-wider uppercase",
                                    children: "Applied to taxable order totals."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 231,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 222,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 212,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white border border-neutral-200 p-8 space-y-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                            children: "Business Details"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 237,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Business Name"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 240,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    name: "business_name",
                                    required: true,
                                    value: form.business_name,
                                    onChange: handleChange,
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                    placeholder: "Miss Tokyo"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 241,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 239,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Business Email"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 251,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "email",
                                    name: "email",
                                    value: form.email,
                                    onChange: handleChange,
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                    placeholder: "hello@misstokyo.shop"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 252,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 250,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Contact / Phone"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 262,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    name: "contact",
                                    value: form.contact,
                                    onChange: handleChange,
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                    placeholder: "+233 ..."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 263,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 261,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                    children: "Business Address"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 273,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    name: "address",
                                    rows: 2,
                                    value: form.address,
                                    onChange: handleChange,
                                    className: "w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black transition-colors resize-none text-sm",
                                    placeholder: "123 Main Street, Accra, Ghana"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 274,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 272,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-end items-center gap-6 pt-2",
                            children: [
                                saved && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-green-600 tracking-wider uppercase",
                                    children: "Saved"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 284,
                                    columnNumber: 35
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    disabled: saving,
                                    className: "px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                                    children: saving ? "Saving..." : "Save Settings"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 285,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 283,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 236,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 210,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
        lineNumber: 209,
        columnNumber: 9
    }, this);
}
function StoreTab() {
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_STORE);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [allCategories, setAllCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [wholesaleCatIds, setWholesaleCatIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Set());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("store_settings").select("*").eq("id", "default").single().then(({ data: sData })=>{
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
        });
        // Fetch all active categories to allow selection
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("categories").select("id, name, is_wholesale").eq("is_active", true).order("name").then(({ data: catData })=>{
            if (catData) {
                setAllCategories(catData);
                setWholesaleCatIds(new Set(catData.filter((c)=>c.is_wholesale).map((c)=>c.id)));
            }
        });
    }, []);
    const handleSave = async (e)=>{
        e.preventDefault();
        setSaving(true);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("store_settings").upsert({
            id: "default",
            ...form
        }, {
            onConflict: "id"
        });
        // Update categories wholesale status
        for (const cat of allCategories){
            const isWholesale = wholesaleCatIds.has(cat.id);
            if (isWholesale !== cat.is_wholesale) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("categories").update({
                    is_wholesale: isWholesale
                }).eq("id", cat.id);
            }
        }
        setSaving(false);
        setSaved(true);
        setTimeout(()=>setSaved(false), 3000);
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-neutral-400 italic font-serif",
            children: "Loading..."
        }, void 0, false, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 376,
            columnNumber: 16
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                onSubmit: handleSave,
                className: "space-y-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-8",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white border border-neutral-200 p-8 space-y-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                            children: "Store Configuration"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 387,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-3 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: form.enable_store_pickup,
                                                            onChange: (e)=>setForm((p)=>({
                                                                        ...p,
                                                                        enable_store_pickup: e.target.checked
                                                                    })),
                                                            className: "w-4 h-4 accent-black"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 391,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                            children: "Enable Store Pickup"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 397,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 390,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                                    children: "Allow customers to pick up orders directly from the atelier."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 399,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 389,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-4 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-3 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: form.maintenance_mode,
                                                            onChange: (e)=>setForm((p)=>({
                                                                        ...p,
                                                                        maintenance_mode: e.target.checked
                                                                    })),
                                                            className: "w-4 h-4 accent-black"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 404,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                            children: "Enable Coming Soon / Maintenance Mode"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 410,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 403,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                                    children: "Restrict access to the shop and show a coming soon placeholder."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 412,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 402,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-4 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                    children: "Default Landing Page"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 416,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 tracking-wider uppercase mb-3",
                                                    children: "Choose which page customers land on when they visit the site root (/)."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 417,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                    ].map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setForm((p)=>({
                                                                        ...p,
                                                                        homepage_route: opt.value
                                                                    })),
                                                            className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.homepage_route === opt.value ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                            children: opt.label
                                                        }, opt.value, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 424,
                                                            columnNumber: 41
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 418,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 415,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-4 border-t border-neutral-100 mt-6 grid grid-cols-1 gap-6",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                            children: "Global Shoe Sizes"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 438,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TagInput$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TagInput"], {
                                                            value: form.global_sizes,
                                                            onChange: (tags)=>setForm((p)=>({
                                                                        ...p,
                                                                        global_sizes: tags
                                                                    })),
                                                            placeholder: "Type a size and press Enter…"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 439,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Press Enter or , to add each size."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 444,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 437,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                            children: "Global Colors"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 448,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TagInput$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TagInput"], {
                                                            value: form.global_colors,
                                                            onChange: (tags)=>setForm((p)=>({
                                                                        ...p,
                                                                        global_colors: tags
                                                                    })),
                                                            placeholder: "Type a color and press Enter…"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 449,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Press Enter or , to add each color."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 454,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 447,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 436,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 386,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 384,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-8",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white border border-neutral-200 p-8 space-y-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                            children: "Visual Merchandising"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 474,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                            children: "Control the product columns on desktop and how many items appear in the homepage featured grid. Mobile stays 2-column, tablet stays 2-column."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 475,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 md:grid-cols-2 gap-8",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                            children: "Homepage Grid Columns"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 481,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex gap-3",
                                                            children: [
                                                                2,
                                                                3,
                                                                4,
                                                                5
                                                            ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    onClick: ()=>setForm((p)=>({
                                                                                ...p,
                                                                                home_grid_cols: n
                                                                            })),
                                                                    className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.home_grid_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                                    children: n
                                                                }, n, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                    lineNumber: 484,
                                                                    columnNumber: 45
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 482,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Columns on the homepage collection grid."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 494,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 480,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                            children: "Shop Page Grid Columns"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 498,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex gap-3",
                                                            children: [
                                                                2,
                                                                3,
                                                                4,
                                                                5
                                                            ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    onClick: ()=>setForm((p)=>({
                                                                                ...p,
                                                                                shop_grid_cols: n
                                                                            })),
                                                                    className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_grid_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                                    children: n
                                                                }, n, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                    lineNumber: 501,
                                                                    columnNumber: 45
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 499,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Columns on the full shop listing grid."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 511,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 497,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                            children: "Shop Page Mobile Columns"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 515,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex gap-3 max-w-[160px]",
                                                            children: [
                                                                1,
                                                                2
                                                            ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    onClick: ()=>setForm((p)=>({
                                                                                ...p,
                                                                                shop_mobile_cols: n
                                                                            })),
                                                                    className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_mobile_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                                    children: n
                                                                }, n, false, {
                                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                    lineNumber: 518,
                                                                    columnNumber: 45
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 516,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                            children: "Grid columns on mobile devices."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 528,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 514,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 479,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-6 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                    children: "Featured Products on Homepage"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 533,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex gap-3 max-w-xs",
                                                    children: [
                                                        4,
                                                        6,
                                                        8,
                                                        12
                                                    ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setForm((p)=>({
                                                                        ...p,
                                                                        home_product_limit: n
                                                                    })),
                                                            className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.home_product_limit === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                            children: n
                                                        }, n, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 536,
                                                            columnNumber: 41
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 534,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                    children: "Number of products shown in the homepage collection grid."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 546,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 532,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-6 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4",
                                                    children: "Shop Page — Products Per Page"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 550,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex gap-3 max-w-sm",
                                                    children: [
                                                        8,
                                                        12,
                                                        16,
                                                        24,
                                                        32
                                                    ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setForm((p)=>({
                                                                        ...p,
                                                                        shop_product_limit: n
                                                                    })),
                                                            className: `flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_product_limit === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`,
                                                            children: n
                                                        }, n, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 553,
                                                            columnNumber: 41
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 551,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                    children: "Total products loaded per page on the shop listing."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 563,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 549,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-6 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-3 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: form.shop_show_title,
                                                            onChange: (e)=>setForm((p)=>({
                                                                        ...p,
                                                                        shop_show_title: e.target.checked
                                                                    })),
                                                            className: "w-4 h-4 accent-black"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 568,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                            children: "Show Shop Page Title & Subtitle"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 574,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 567,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                                    children: "Display the hero text header above the product grid on the shop page."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 576,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 566,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pt-6 border-t border-neutral-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-3 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: form.shop_image_stretch,
                                                            onChange: (e)=>setForm((p)=>({
                                                                        ...p,
                                                                        shop_image_stretch: e.target.checked
                                                                    })),
                                                            className: "w-4 h-4 accent-black"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 581,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                            children: "Stretch Product Images to Fill Frame"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                            lineNumber: 587,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 580,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                                    children: "When on, images fill the card exactly (may distort). When off, images are cropped to fit."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 589,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 579,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 473,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 471,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 382,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border border-neutral-200 p-8 space-y-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                children: "Platform Fees"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 598,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                children: "A percentage-based fee applied to all orders, invoices, and payment links to offset processing charges."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 599,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                children: "Fee Percentage (%)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 605,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                min: "0",
                                                max: "100",
                                                step: "0.1",
                                                value: form.platform_fee_percentage,
                                                onChange: (e)=>setForm((p)=>({
                                                            ...p,
                                                            platform_fee_percentage: parseFloat(e.target.value) || 0
                                                        })),
                                                className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                                placeholder: "2.5"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 606,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                children: "e.g. 2.5 adds 2.5% to every order total."
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 616,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 604,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2",
                                                children: "Fee Label"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 619,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                value: form.platform_fee_label,
                                                onChange: (e)=>setForm((p)=>({
                                                            ...p,
                                                            platform_fee_label: e.target.value
                                                        })),
                                                className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors",
                                                placeholder: "Service Charge"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 620,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase",
                                                children: "Label shown to customers on receipts."
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 627,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 618,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 603,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-4 border-t border-neutral-100",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "flex items-center gap-3 cursor-pointer",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                checked: form.show_fee_at_checkout,
                                                onChange: (e)=>setForm((p)=>({
                                                            ...p,
                                                            show_fee_at_checkout: e.target.checked
                                                        })),
                                                className: "w-4 h-4 accent-black"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 633,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                children: "Show Fee as Itemised Line at Checkout"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 639,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 632,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7",
                                        children: 'When off, the fee is silently rolled into "Shipping & Handling" so the total still adds up without a visible surcharge line.'
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 641,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 631,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 597,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border border-neutral-200 p-8 space-y-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                children: "Feature Toggles"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 649,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                children: "Enable or disable storefront sections. Hidden sections are removed from the navigation."
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 650,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                ].map(({ key, label, desc })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "py-4 border-b border-neutral-100 last:border-b-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center gap-3 cursor-pointer",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        checked: form[key],
                                                        onChange: (e)=>setForm((p)=>({
                                                                    ...p,
                                                                    [key]: e.target.checked
                                                                })),
                                                        className: "w-4 h-4 accent-black"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 662,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                        children: label
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 665,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 661,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-neutral-400 mt-1 tracking-wider uppercase ml-7",
                                                children: desc
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 667,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, key, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 660,
                                        columnNumber: 29
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 652,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 648,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border border-neutral-200 p-8 space-y-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4",
                                        children: "Wholesale / B2B Configuration"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 676,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 tracking-wider uppercase mt-4",
                                        children: "Enable B2B wholesale pricing with quantity-based tiers. Wholesale users see custom pricing instead of retail prices on the storefront."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 677,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 675,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "flex items-center gap-3 cursor-pointer",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                checked: form.wholesale_enabled,
                                                onChange: (e)=>setForm((p)=>({
                                                            ...p,
                                                            wholesale_enabled: e.target.checked
                                                        })),
                                                className: "w-4 h-4 accent-black"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 684,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                children: "Enable Global Tier-Based Pricing"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 690,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 683,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 mt-1 tracking-wider uppercase ml-7",
                                        children: "When on, users with the Wholesale role see tier-based pricing on product pages."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 692,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 682,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-6 border-t border-neutral-100 space-y-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-[10px] uppercase tracking-[0.1em] font-bold text-black",
                                                children: "Wholesale Exclusive Categories"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 699,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[9px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded",
                                                children: "Access Protection"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 700,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 698,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                        children: "Toggle categories that should be restricted to wholesale users only. Products assigned ONLY to these will be hidden from retail customers."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 702,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 sm:grid-cols-3 gap-2",
                                        children: allCategories.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>{
                                                    const next = new Set(wholesaleCatIds);
                                                    if (next.has(cat.id)) next.delete(cat.id);
                                                    else next.add(cat.id);
                                                    setWholesaleCatIds(next);
                                                },
                                                className: `flex items-center gap-3 px-3 py-2.5 border text-[9px] font-bold uppercase tracking-widest transition-all ${wholesaleCatIds.has(cat.id) ? "bg-black text-white border-black" : "bg-white text-neutral-400 border-neutral-100 hover:border-neutral-200"}`,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `w-1.5 h-1.5 rounded-full ${wholesaleCatIds.has(cat.id) ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-neutral-100"}`
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 721,
                                                        columnNumber: 37
                                                    }, this),
                                                    cat.name
                                                ]
                                            }, cat.id, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 707,
                                                columnNumber: 33
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 705,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 697,
                                columnNumber: 21
                            }, this),
                            form.wholesale_enabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-6 border-t border-neutral-100 space-y-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-neutral-400 tracking-wider uppercase",
                                        children: "Define the quantity range for each pricing tier. These ranges apply globally across all products."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 730,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-1 md:grid-cols-3 gap-6",
                                        children: [
                                            1,
                                            2,
                                            3
                                        ].map((tier)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-4 p-5 border border-neutral-100 bg-neutral-50",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500",
                                                        children: [
                                                            "Tier ",
                                                            tier
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 736,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "grid grid-cols-2 gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "block text-[9px] uppercase tracking-widest text-neutral-400 mb-1",
                                                                        children: "Min Qty"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                        lineNumber: 739,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "number",
                                                                        min: "1",
                                                                        value: form[`wholesale_tier_${tier}_min`],
                                                                        onChange: (e)=>setForm((p)=>({
                                                                                    ...p,
                                                                                    [`wholesale_tier_${tier}_min`]: parseInt(e.target.value) || 1
                                                                                })),
                                                                        className: "w-full border-b border-neutral-300 bg-transparent py-1.5 outline-none focus:border-black text-sm text-center transition-colors"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                        lineNumber: 740,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                lineNumber: 738,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "block text-[9px] uppercase tracking-widest text-neutral-400 mb-1",
                                                                        children: "Max Qty"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                        lineNumber: 748,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "number",
                                                                        min: "1",
                                                                        value: form[`wholesale_tier_${tier}_max`],
                                                                        onChange: (e)=>setForm((p)=>({
                                                                                    ...p,
                                                                                    [`wholesale_tier_${tier}_max`]: parseInt(e.target.value) || 1
                                                                                })),
                                                                        className: "w-full border-b border-neutral-300 bg-transparent py-1.5 outline-none focus:border-black text-sm text-center transition-colors"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                        lineNumber: 749,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                                lineNumber: 747,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 737,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[9px] text-neutral-400 tracking-widest uppercase",
                                                        children: [
                                                            form[`wholesale_tier_${tier}_min`],
                                                            " – ",
                                                            form[`wholesale_tier_${tier}_max`],
                                                            " units"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                        lineNumber: 757,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, tier, true, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 735,
                                                columnNumber: 37
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 733,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 729,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 674,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-end items-center gap-6",
                        children: [
                            saved && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-green-600 tracking-wider uppercase",
                                children: "Saved successfully"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 768,
                                columnNumber: 31
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "submit",
                                disabled: saving,
                                className: "px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                                children: saving ? "Saving..." : "Save Store Settings"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 769,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 767,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 381,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CarouselConfigSection, {}, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 777,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
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
    const [categories, setCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tabs, setTabs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_CAROUSEL_TABS);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("categories").select("name, slug").eq("is_active", true).order("name"),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_copy").select("value").eq("copy_key", "carousel_config").maybeSingle()
        ]).then(([{ data: cats }, { data: config }])=>{
            if (cats) setCategories(cats);
            if (config?.value) {
                try {
                    const parsed = JSON.parse(config.value);
                    if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) setTabs(parsed.tabs);
                } catch  {}
            }
            setLoading(false);
        });
    }, []);
    const updateTab = (i, field, value)=>{
        setTabs((prev)=>prev.map((t, idx)=>idx === i ? {
                    ...t,
                    [field]: value
                } : t));
    };
    const handleSave = async ()=>{
        setSaving(true);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_copy").upsert({
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-white border border-neutral-200 p-8 space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-b border-neutral-100 pb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-xs font-semibold uppercase tracking-widest",
                        children: "Homepage Carousel Tabs"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 836,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-neutral-400 mt-1 tracking-wider uppercase",
                        children: 'Configure the tabs on the "A Moment For New" carousel. Filter by category or show all products.'
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 837,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 835,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-8",
                children: tabs.map((tab, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4 border border-neutral-100 p-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] font-semibold uppercase tracking-widest text-neutral-500",
                                children: [
                                    "Tab ",
                                    i + 1
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 845,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1",
                                        children: "Label"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 848,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        value: tab.label,
                                        onChange: (e)=>updateTab(i, "label", e.target.value),
                                        className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                        placeholder: "e.g. New In"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 849,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 847,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1",
                                        children: "Sort Order"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 859,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: tab.mode,
                                        onChange: (e)=>updateTab(i, "mode", e.target.value),
                                        className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "newest",
                                                children: "Newest First"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 865,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "sort_order",
                                                children: "Admin Sort Order (Bestsellers)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 866,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 860,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 858,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1",
                                        children: "Category Filter"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 871,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: tab.category_name,
                                        onChange: (e)=>updateTab(i, "category_name", e.target.value),
                                        className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All Products"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 877,
                                                columnNumber: 33
                                            }, this),
                                            categories.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: c.name,
                                                    children: c.name
                                                }, c.slug, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 879,
                                                    columnNumber: 37
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 872,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 870,
                                columnNumber: 25
                            }, this)
                        ]
                    }, i, true, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 844,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 842,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-end items-center gap-6 pt-2",
                children: [
                    saved && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-xs text-green-600 tracking-wider uppercase",
                        children: "Saved"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 888,
                        columnNumber: 27
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: handleSave,
                        disabled: saving,
                        className: "px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                        children: saving ? "Saving..." : "Save Carousel Config"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                        lineNumber: 889,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 887,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
        lineNumber: 834,
        columnNumber: 9
    }, this);
}
function SEOTab() {
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [metadataList, setMetadataList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedPath, setSelectedPath] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("/");
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        page_path: "/",
        title: "",
        description: "",
        og_image_url: "",
        keywords: ""
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        fetchMetadata();
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const existing = metadataList.find((m)=>m.page_path === selectedPath);
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
    }, [
        selectedPath,
        metadataList
    ]);
    const fetchMetadata = async ()=>{
        setLoading(true);
        const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_metadata").select("*");
        if (data) setMetadataList(data);
        setLoading(false);
    };
    const handleChange = (e)=>{
        setFormData((prev)=>({
                ...prev,
                [e.target.name]: e.target.value
            }));
    };
    const handleSave = async (e)=>{
        e.preventDefault();
        setSaving(true);
        try {
            const { page_path, title, description, og_image_url, keywords } = formData;
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("site_metadata").upsert({
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
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("SEO metadata saved.");
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to save SEO metadata.");
        } finally{
            setSaving(false);
        }
    };
    const titleLength = formData.title.length;
    const descriptionLength = formData.description.length;
    const titleColor = titleLength > 60 ? "text-red-500" : "text-neutral-500";
    const descColor = descriptionLength > 160 ? "text-red-500" : "text-neutral-500";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 lg:grid-cols-2 gap-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white p-8 border border-neutral-200",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSave,
                    className: "space-y-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "page_path",
                                    className: "block text-xs uppercase tracking-widest font-semibold mb-3",
                                    children: "Target Route"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 982,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    id: "page_path",
                                    value: selectedPath,
                                    onChange: (e)=>setSelectedPath(e.target.value),
                                    className: "w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors uppercase text-sm font-medium tracking-wide appearance-none",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "/",
                                            children: "Home (/)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 989,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "/shop",
                                            children: "Shop (/shop)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 990,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "/craft",
                                            children: "Craft (/craft)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 991,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "/custom",
                                            children: "Custom (/custom)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 992,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 983,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 981,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-end mb-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "title",
                                            className: "block text-xs uppercase tracking-widest font-semibold",
                                            children: "Meta Title"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 998,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: `text-[10px] tracking-widest ${titleColor}`,
                                            children: [
                                                titleLength,
                                                " / 60"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 999,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 997,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    id: "title",
                                    name: "title",
                                    value: formData.title,
                                    onChange: handleChange,
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none",
                                    placeholder: "Miss Tokyo | Handcrafted in Ghana"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1001,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 996,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-end mb-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "description",
                                            className: "block text-xs uppercase tracking-widest font-semibold",
                                            children: "Meta Description"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1014,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: `text-[10px] tracking-widest ${descColor}`,
                                            children: [
                                                descriptionLength,
                                                " / 160"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1015,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1013,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    id: "description",
                                    name: "description",
                                    rows: 4,
                                    value: formData.description,
                                    onChange: handleChange,
                                    className: "w-full border border-neutral-200 p-4 bg-transparent outline-none focus:border-black transition-colors resize-y",
                                    placeholder: "Discover our latest collection..."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1017,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1012,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "keywords",
                                    className: "block text-xs uppercase tracking-widest font-semibold mb-3",
                                    children: "Keywords (Comma Separated)"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1029,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    id: "keywords",
                                    name: "keywords",
                                    value: formData.keywords,
                                    onChange: handleChange,
                                    className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none",
                                    placeholder: "leather, bespoke, artisanal, ghana"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1030,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1028,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ImageUploader$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ImageUploader"], {
                                bucket: "site-assets",
                                folder: "og-images",
                                currentUrl: formData.og_image_url || null,
                                onUpload: (url)=>setFormData((prev)=>({
                                            ...prev,
                                            og_image_url: url
                                        })),
                                aspectRatio: "og",
                                label: "Social Share Image"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                lineNumber: 1042,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1041,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: loading || saving,
                            className: "w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50",
                            children: saving ? "Saving..." : "Save Route Metadata"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1052,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 980,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 979,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "sticky top-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4 mb-6",
                            children: "Google Search Preview"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1065,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white p-6 border border-neutral-200 shadow-sm font-sans max-w-md",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-[12px] text-neutral-800 flex items-center gap-2 mb-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-6 h-6 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-serif italic text-[10px]",
                                                children: "B"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                lineNumber: 1069,
                                                columnNumber: 33
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1068,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "font-medium",
                                                    children: "Miss Tokyo"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 1072,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-neutral-500 text-[10px]",
                                                    children: [
                                                        "https://misstokyo.shop",
                                                        selectedPath
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                                    lineNumber: 1073,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1071,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1067,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-[#1a0dab] text-lg font-medium cursor-pointer hover:underline mb-1 w-full truncate",
                                    children: formData.title || "Page Title Will Appear Here"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1076,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[13px] text-[#4d5156] leading-snug line-clamp-2",
                                    children: formData.description || "The meta description will appear here. Keep it under 160 characters to prevent it from being truncated in search results."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1079,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1066,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4 mb-6 mt-12",
                            children: "Social Card Preview"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1084,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white border text-center border-neutral-200 shadow-sm font-sans max-w-md overflow-hidden rounded-md",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-full h-48 bg-neutral-100 flex items-center justify-center text-neutral-400 capitalize",
                                    children: formData.og_image_url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: formData.og_image_url,
                                        alt: "Social Cover",
                                        className: "w-full h-full object-cover"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                        lineNumber: 1088,
                                        columnNumber: 33
                                    }, this) : "No Image Provided"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1086,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-4 bg-neutral-50 border-t border-neutral-200 text-left",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] uppercase tracking-widest text-neutral-500 mb-1",
                                            children: "misstokyo.shop"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1094,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-medium text-neutral-900 mb-1 truncate",
                                            children: formData.title || "Page Title"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1095,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-neutral-500 truncate",
                                            children: formData.description || "Page description..."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1096,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1093,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1085,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 1064,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                lineNumber: 1063,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
        lineNumber: 977,
        columnNumber: 9
    }, this);
}
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
    const [channel, setChannel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("email");
    const [templates, setTemplates] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [saved, setSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("communication_templates").select("*").then(({ data })=>{
            setTemplates(data ?? []);
            setLoading(false);
        });
    }, []);
    const getTemplate = (event_type)=>{
        return templates.find((t)=>t.channel === channel && t.event_type === event_type) ?? {
            channel,
            event_type,
            subject: "",
            greeting: "",
            body_text: ""
        };
    };
    const handleUpdate = (event_type, field, value)=>{
        setTemplates((prev)=>{
            const exists = prev.find((t)=>t.channel === channel && t.event_type === event_type);
            if (exists) {
                return prev.map((t)=>t.channel === channel && t.event_type === event_type ? {
                        ...t,
                        [field]: value
                    } : t);
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
    const handleSave = async (event_type)=>{
        const tpl = getTemplate(event_type);
        const key = `${channel}-${event_type}`;
        setSaving(key);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("communication_templates").upsert({
            ...tpl,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "channel,event_type"
        });
        setSaving(null);
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Failed to save template.");
        } else {
            setSaved(key);
            setTimeout(()=>setSaved(null), 3000);
        }
    };
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-neutral-400 italic font-serif",
        children: "Loading..."
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
        lineNumber: 1180,
        columnNumber: 25
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8 max-w-3xl",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white border border-neutral-200 p-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4 mb-6",
                    children: "Communication Templates"
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 1185,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[10px] text-neutral-400 tracking-wider uppercase mb-6",
                    children: "Customise the messages sent to customers for each event. Dynamic values (order ID, rider info) are injected automatically."
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 1186,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex gap-0 border-b border-neutral-200 mb-8",
                    children: [
                        "email",
                        "sms"
                    ].map((ch)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setChannel(ch),
                            className: `px-6 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors ${channel === ch ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`,
                            children: ch === "email" ? "Email" : "SMS"
                        }, ch, false, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1192,
                            columnNumber: 25
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 1190,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-8",
                    children: COMM_EVENTS.map(({ key, label })=>{
                        const tpl = getTemplate(key);
                        const saveKey = `${channel}-${key}`;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "border border-neutral-100 p-6 space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-[10px] font-semibold uppercase tracking-widest text-neutral-600",
                                    children: label
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1209,
                                    columnNumber: 33
                                }, this),
                                channel === "email" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500",
                                            children: "Subject Line"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1213,
                                            columnNumber: 41
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: tpl.subject ?? "",
                                            onChange: (e)=>handleUpdate(key, "subject", e.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                            placeholder: "Email subject..."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1214,
                                            columnNumber: 41
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1212,
                                    columnNumber: 37
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500",
                                            children: "Greeting"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1225,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: tpl.greeting ?? "",
                                            onChange: (e)=>handleUpdate(key, "greeting", e.target.value),
                                            className: "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors",
                                            placeholder: channel === "email" ? "Hello," : "Miss Tokyo:"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1226,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1224,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500",
                                            children: channel === "email" ? "Body Text" : "Message"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1236,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                            rows: channel === "email" ? 4 : 2,
                                            value: tpl.body_text,
                                            onChange: (e)=>handleUpdate(key, "body_text", e.target.value),
                                            className: "w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-none",
                                            placeholder: "Message body..."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1239,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1235,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>handleSave(key),
                                            disabled: saving === saveKey,
                                            className: "px-6 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50",
                                            children: saving === saveKey ? "Saving..." : "Save"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1249,
                                            columnNumber: 37
                                        }, this),
                                        saved === saveKey && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-[10px] text-green-600 uppercase tracking-wider",
                                            children: "Saved"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                            lineNumber: 1257,
                                            columnNumber: 41
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                                    lineNumber: 1248,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, key, true, {
                            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                            lineNumber: 1208,
                            columnNumber: 29
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
                    lineNumber: 1203,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
            lineNumber: 1184,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/(dashboard)/settings/page.tsx",
        lineNumber: 1183,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=src_44777367._.js.map
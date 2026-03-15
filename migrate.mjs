/**
 * Wix Store → Supabase Migration Script
 * ─────────────────────────────────────
 * Phases:
 *   1. Parse CSV   → products + variants + categories
 *   2. Download images from Wix CDN → upload to Supabase Storage
 *   3. Upsert into Supabase DB (products, categories, product_categories, product_variants)
 *
 * Usage:
 *   node migrate.mjs
 *
 * Env vars required (in .env or shell):
 *   SUPABASE_URL          e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  service_role key (not anon)
 *   CSV_PATH              path to catalog_products.csv
 *   STORAGE_BUCKET        e.g. product-images
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

// ─── Config ──────────────────────────────────────────────────────────────────

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  CSV_PATH = "./catalog_products.csv",
  STORAGE_BUCKET = "product-images",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Wix CDN base — partial hashes expand to full URLs via this prefix
const WIX_CDN_BASE = "https://static.wixstatic.com/media/";

// ─── Logger ──────────────────────────────────────────────────────────────────

const LOG_PATH = "./migration.log";
const logLines = [];

function log(level, msg, extra = "") {
  const line = `[${level}] ${msg}${extra ? " | " + extra : ""}`;
  logLines.push(line);
  if (level === "ERROR" || level === "WARN") console.error(line);
  else console.log(line);
}

function flushLog() {
  fs.writeFileSync(LOG_PATH, logLines.join("\n") + "\n");
  console.log(`\n📄  Full log written to ${LOG_PATH}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "My Product Name" → "my-product-name" */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parse Wix color strings into a human label.
 * "rgb(239,0,126):Pink"  → "Pink"
 * "#ffc0cb:Pink"         → "Pink"
 * "Black"                → "Black"   (plain value, no colon)
 */
function parseColorLabel(raw) {
  if (!raw) return null;
  const colonIdx = raw.lastIndexOf(":");
  return colonIdx !== -1 ? raw.slice(colonIdx + 1).trim() : raw.trim();
}

/**
 * Normalise Wix inventory field to { qty, in_stock }.
 * "InStock" → qty=null, in_stock=true
 * "0"       → qty=0,    in_stock=false
 * "5"       → qty=5,    in_stock=true
 */
function parseInventory(raw) {
  if (!raw || raw === "") return { qty: null, in_stock: null };
  if (raw === "InStock") return { qty: null, in_stock: true };
  const n = parseInt(raw, 10);
  if (isNaN(n)) return { qty: null, in_stock: true };
  return { qty: n, in_stock: n > 0 };
}

/**
 * Construct full Wix CDN URL from the partial hash stored in the CSV.
 * "7ee6d5_fd024369710c44e2b3bc1813db4e2367~mv2.png"
 * → "https://static.wixstatic.com/media/7ee6d5_fd024369710c44e2b3bc1813db4e2367~mv2.png"
 */
function wixImageUrl(hash) {
  return `${WIX_CDN_BASE}${hash.trim()}`;
}

/** Strip HTML tags from Wix description fields */
function stripHtml(str) {
  return str ? str.replace(/<[^>]+>/g, "").trim() : null;
}

// ─── Phase 1: Parse CSV ───────────────────────────────────────────────────────

log("INFO", "Phase 1 — Parsing CSV", CSV_PATH);

const raw = fs.readFileSync(CSV_PATH, "utf-8");
const rows = parse(raw, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  relax_column_count: true,
});

// Group rows by handleId — each product has 1 Product row + N Variant rows
const productMap = new Map(); // handleId → { product: row, variants: row[] }

for (const row of rows) {
  const id = row.handleId;
  if (!id) continue;

  if (row.fieldType === "Product") {
    if (!productMap.has(id)) productMap.set(id, { product: row, variants: [] });
    else productMap.get(id).product = row; // shouldn't happen, but safe
  } else if (row.fieldType === "Variant") {
    if (!productMap.has(id)) productMap.set(id, { product: null, variants: [] });
    productMap.get(id).variants.push(row);
  }
}

log("INFO", `Parsed ${productMap.size} products from CSV`);

// Collect all unique category names
const allCategoryNames = new Set();
for (const { product } of productMap.values()) {
  if (!product?.collection) continue;
  for (const cat of product.collection.split(";")) {
    const c = cat.trim();
    if (c) allCategoryNames.add(c);
  }
}

log("INFO", `Found ${allCategoryNames.size} unique categories`);

// ─── Phase 2: Image Migration ─────────────────────────────────────────────────

log("INFO", "Phase 2 — Migrating images to Supabase Storage");

/**
 * Download one image from Wix CDN and upload to Supabase Storage.
 * Returns the public URL on success, null on any failure.
 * Path: {bucket}/{productId}/{filename}
 */
async function migrateImage(wixHash, productId) {
  const url = wixImageUrl(wixHash);
  const filename = path.basename(wixHash.trim());
  const storagePath = `${productId}/${filename}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      log("WARN", `Image download failed (${res.status})`, url);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      log("WARN", `Storage upload failed`, `${storagePath} — ${error.message}`);
      return null;
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  } catch (err) {
    log("WARN", `Image migration exception`, `${url} — ${err.message}`);
    return null;
  }
}

// Migrate images for all products, collect publicUrl arrays
// keyed by handleId
const productImageUrls = new Map(); // handleId → string[]

let totalImages = 0;
let failedImages = 0;

for (const [handleId, { product }] of productMap.entries()) {
  if (!product?.productImageUrl) {
    productImageUrls.set(handleId, []);
    continue;
  }

  const hashes = product.productImageUrl
    .split(";")
    .map((h) => h.trim())
    .filter(Boolean);

  const publicUrls = [];

  for (const hash of hashes) {
    totalImages++;
    const publicUrl = await migrateImage(hash, handleId);
    if (publicUrl) {
      publicUrls.push(publicUrl);
    } else {
      failedImages++;
      log("WARN", `Skipping failed image for product`, `${handleId} — ${hash}`);
    }
  }

  productImageUrls.set(handleId, publicUrls);
  log(
    "INFO",
    `Images migrated for "${product.name}"`,
    `${publicUrls.length}/${hashes.length} ok`
  );
}

log(
  "INFO",
  `Image migration complete`,
  `${totalImages - failedImages}/${totalImages} succeeded, ${failedImages} skipped`
);

// ─── Phase 3: Upsert into Supabase DB ────────────────────────────────────────

log("INFO", "Phase 3 — Upserting into Supabase");

// 3a. Upsert categories
const categoryRows = [...allCategoryNames].map((name, i) => ({
  name,
  slug: slugify(name),
  sort_order: i,
  is_active: true,
}));

const { data: insertedCategories, error: catError } = await supabase
  .from("categories")
  .upsert(categoryRows, { onConflict: "slug" })
  .select("id, slug");

if (catError) {
  log("ERROR", "Category upsert failed", catError.message);
  flushLog();
  process.exit(1);
}

// Build slug → id lookup
const categoryIdBySlug = new Map(
  insertedCategories.map((c) => [c.slug, c.id])
);

log("INFO", `Categories upserted`, `${insertedCategories.length} rows`);

// 3b. Upsert products + variants
let productsOk = 0;
let productsErr = 0;
let variantsOk = 0;
let variantsErr = 0;

for (const [handleId, { product, variants }] of productMap.entries()) {
  if (!product) {
    log("WARN", `No Product row found for handleId`, handleId);
    continue;
  }

  const images = productImageUrls.get(handleId) ?? [];
  const isOnSale =
    product.discountMode === "PERCENT" &&
    parseFloat(product.discountValue) > 0;

  // First category becomes the product's primary category_type
  const firstCategory = (product.collection || "").split(";")[0]?.trim() || null;

  // Extract available sizes and colors from product-level option definitions
  const opt1Name = product.productOptionName1?.trim().toLowerCase();
  const opt2Name = product.productOptionName2?.trim().toLowerCase();

  const availableSizes = (opt1Name === "size"
    ? (product.productOptionDescription1 || "")
    : opt2Name === "size"
    ? (product.productOptionDescription2 || "")
    : ""
  ).split(";").map(s => s.trim()).filter(Boolean);

  const availableColors = (opt1Name === "color"
    ? (product.productOptionDescription1 || "")
    : opt2Name === "color"
    ? (product.productOptionDescription2 || "")
    : ""
  ).split(";").map(s => parseColorLabel(s.trim())).filter(Boolean);

  const inv = parseInventory(product.inventory);

  const productRow = {
    wix_handle_id: handleId,
    name: product.name?.trim() || null,
    description: stripHtml(product.description),
    price_ghs: parseFloat(product.price) || 0,
    discount_mode: product.discountMode || null,
    discount_value: parseFloat(product.discountValue) || 0,
    ribbon: product.ribbon?.trim() || null,
    brand: product.brand?.trim() || null,
    is_active: product.visible === "true",
    is_sale: isOnSale,
    image_urls: images,
    slug: slugify(product.name || handleId),
    category_type: firstCategory,
    inventory_count: inv.qty ?? 0,
    ...(availableSizes.length > 0  && { available_sizes: availableSizes }),
    ...(availableColors.length > 0 && { available_colors: availableColors }),
  };

  // Upsert the product row
  const { data: insertedProduct, error: prodError } = await supabase
    .from("products")
    .upsert(productRow, { onConflict: "wix_handle_id" })
    .select("id")
    .single();

  if (prodError || !insertedProduct) {
    log(
      "ERROR",
      `Product upsert failed: "${product.name}"`,
      prodError?.message
    );
    productsErr++;
    continue;
  }

  productsOk++;
  const productId = insertedProduct.id;

  // 3c. Link product → categories
  const categoryNames = (product.collection || "")
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);

  const productCategoryRows = categoryNames
    .map((name) => categoryIdBySlug.get(slugify(name)))
    .filter(Boolean)
    .map((categoryId) => ({ product_id: productId, category_id: categoryId }));

  if (productCategoryRows.length > 0) {
    const { error: pcError } = await supabase
      .from("product_categories")
      .upsert(productCategoryRows, {
        onConflict: "product_id,category_id",
      });

    if (pcError) {
      log(
        "WARN",
        `product_categories link failed for "${product.name}"`,
        pcError.message
      );
    }
  }

  // 3d. Upsert variants
  // If no Variant rows exist, synthesise one from the Product row itself
  const variantSource =
    variants.length > 0
      ? variants
      : [{ ...product, fieldType: "Variant" }];

  for (const v of variantSource) {
    const inv = parseInventory(v.inventory);

    // Option values — stored as both raw value and human label
    // Product row uses productOptionName1/Description1 for option metadata
    // Variant row uses productOptionDescription1 as the selected value
    const opt1Val = v.productOptionDescription1?.trim() || null;
    const opt2Val = v.productOptionDescription2?.trim() || null;

    const variantRow = {
      product_id: productId,
      sku: v.sku?.trim() || null,
      price_override: v.price ? parseFloat(v.price) || null : null,
      inventory_qty: inv.qty,
      in_stock: inv.in_stock,
      visible: v.visible === "true",
      option1_name: product.productOptionName1?.trim() || null,
      option1_value: opt1Val,
      option1_label: parseColorLabel(opt1Val),
      option2_name: product.productOptionName2?.trim() || null,
      option2_value: opt2Val,
      option2_label: parseColorLabel(opt2Val),
    };

    const { error: varError } = await supabase
      .from("product_variants")
      .upsert(variantRow, { onConflict: "product_id,sku,option1_value,option2_value" });

    if (varError) {
      log(
        "WARN",
        `Variant upsert failed for product "${product.name}"`,
        varError.message
      );
      variantsErr++;
    } else {
      variantsOk++;
    }
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

log("INFO", "─── Migration Complete ───────────────────────");
log("INFO", `Products`, `${productsOk} ok, ${productsErr} failed`);
log("INFO", `Variants`, `${variantsOk} ok, ${variantsErr} failed`);
log(
  "INFO",
  `Images`,
  `${totalImages - failedImages} migrated, ${failedImages} skipped`
);
log("INFO", `Categories`, `${insertedCategories.length} upserted`);

flushLog();

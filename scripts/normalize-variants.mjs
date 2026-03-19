/**
 * Variant Normalization Script — Wix Migration Cleanup
 *
 * Normalizes available_colors and available_sizes TEXT[] columns across all products.
 * Also writes structured color_variants and size_variants JSONB for future use.
 *
 * Run: node scripts/normalize-variants.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// ── Load .env.local ──────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");
const envLines = fs.readFileSync(envPath, "utf8").split("\n");
const env = {};
for (const line of envLines) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Normalization dictionaries ────────────────────────────────────────────────
const COLOR_MAP = {
  "Army green 2":   "Army Green",
  "Army green":     "Army Green",
  "Biege":          "Beige",
  "Blue black":     "Blue Black",
  "Blueblack":      "Blue Black",
  "Dark gray":      "Dark Grey",
  "Muve":           "Mauve",
  "Navy blue":      "Navy",
  "Sea blue":       "Sea Blue",
  "Seablue":        "Sea Blue",
  "Turquoise blue": "Turquoise",
};

const SIZE_MAP = {
  "Xtra Small":       "XS",
  "Small":            "S",
  "Medium":           "M",
  "Medium (10/12)":   "M",
  "Large":            "L",
  "Large(12/14)":     "L",
  "Extra large":      "XL",
  "Extra large(14/16)": "XL",
  "2 Extra Large":    "XXL",
  "3 Extra large":    "XXXL",
  "Free (10-18)":     "Free Size",
  "Free (6-10)":      "Free Size",
  "Free (8-16)":      "Free Size",
  "Free size (8-14)": "Free Size",
  "Free(10-16)":      "Free Size",
  "Free(6-12)":       "Free Size",
  "Free(6-14)":       "Free Size",
  "Free(8-14)":       "Free Size",
  "Free(8-16)":       "Free Size",
  "Free(8-18)":       "Free Size",
};

// Colors that landed incorrectly inside size_variants
const STRAY_COLORS_IN_SIZES = new Set(["Black", "Blue", "Brown", "Pink", "White", "Wine"]);

// Known RGB → color name (for rgb(r,g,b):Size patterns from Wix)
const RGB_COLOR_MAP = {
  "0,0,0":           "Black",
  "255,255,255":     "White",
  "250,250,250":     "White",
  "245,245,245":     "White",
};

// Standard hex values for colors when populating color_variants JSONB
const COLOR_HEX = {
  Black:       "#0f0f0f",
  White:       "#f5f5f5",
  Red:         "#e8485a",
  Pink:        "#f4a0b5",
  Purple:      "#8b5cf6",
  Blue:        "#3b82f6",
  Green:       "#22c55e",
  Orange:      "#f97316",
  Yellow:      "#eab308",
  Brown:       "#92400e",
  Beige:       "#d4b896",
  Grey:        "#6b7280",
  Gray:        "#6b7280",
  Navy:        "#1e3a5f",
  Khaki:       "#c3b091",
  Teal:        "#0d9488",
  "Teal Green":"#0d9488",
  Nude:        "#d4a574",
  Camel:       "#c19a6b",
  Cream:       "#f5f0e8",
  Ivory:       "#f8f4e8",
  Maroon:      "#800000",
  Wine:        "#722f37",
  Gold:        "#c9a84c",
  Silver:      "#c0c0c0",
  Lilac:       "#c8a2c8",
  Peach:       "#ffcba4",
  Sage:        "#bcceab",
  Mint:        "#98d8c8",
  Chocolate:   "#3d1c02",
  Mustard:     "#e1ad01",
  Mauve:       "#c8a2c8",
  "Blue Black": "#1a1a2e",
  "Dark Grey":  "#4b5563",
  "Army Green": "#4a5240",
  "Sea Blue":   "#3b82c4",
  Turquoise:   "#40e0d0",
  Apricot:     "#fbceb1",
  Ash:         "#b2bec3",
  "Burnt Orange": "#cc5500",
  "Butter Yellow": "#faf0be",
  "Coffee Brown": "#6f4e37",
  Curry:       "#c8a415",
  "Dark Green": "#1a3c34",
  "Dusty Pink": "#d4a5a5",
  "Emerald Green": "#009b77",
  "Golden Yellow": "#ffc200",
  "Light Brown": "#b5651d",
  "Light Pink":  "#ffb6c1",
  "Light Purple":"#c8b4e8",
  "Mint Green":  "#98d8c8",
  "Mustard Yellow": "#e1ad01",
  "Olive Green": "#6b8e23",
  "Off White":   "#f8f8f0",
  "Pale Green":  "#98fb98",
  "Pale Pink":   "#fadadd",
  "Pink Peach":  "#ffcba4",
  "Rose Gold":   "#b76e79",
  "Sky Blue":    "#87ceeb",
  Violet:       "#7f00ff",
  "Black and White": "#888888",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Title-case: "dusty pink" → "Dusty Pink" */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Normalize a single color name: apply map, then title case */
function normalizeColor(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (COLOR_MAP[trimmed]) return COLOR_MAP[trimmed];
  return toTitleCase(trimmed);
}

/** Normalize a single size label: apply map exactly as-is */
function normalizeSize(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return SIZE_MAP[trimmed] ?? trimmed;
}

/** Deduplicate an array (case-insensitive for strings) preserving first occurrence */
function dedupeStrings(arr) {
  const seen = new Set();
  return arr.filter(v => {
    const key = (v || "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Extract color name from "rgb(r,g,b)" */
function rgbToColorName(rgbStr) {
  const m = rgbStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!m) return null;
  const key = `${m[1]},${m[2]},${m[3]}`;
  return RGB_COLOR_MAP[key] || null;
}

/**
 * Normalize available_colors and available_sizes TEXT[] for one product.
 * Returns { colors, sizes } — the cleaned arrays.
 */
function normalizeProduct(available_colors, available_sizes) {
  const colors = new Set((available_colors || []).map(normalizeColor).filter(Boolean));
  const sizes  = [];

  for (const rawSize of (available_sizes || [])) {
    if (!rawSize) continue;
    const trimmed = rawSize.trim();

    // ── Rescue stray colors in sizes ──
    if (STRAY_COLORS_IN_SIZES.has(trimmed)) {
      const normalized = normalizeColor(trimmed);
      if (normalized) colors.add(normalized);
      continue; // remove from sizes
    }

    // ── Rescue rgb(...):Size pattern ──
    const rgbMatch = trimmed.match(/^(rgb\([^)]+\)):(.+)$/i);
    if (rgbMatch) {
      const colorName = rgbToColorName(rgbMatch[1]);
      if (colorName) colors.add(colorName);
      const sizePart = normalizeSize(rgbMatch[2].trim());
      if (sizePart) sizes.push(sizePart);
      continue;
    }

    // ── Normal size ──
    const normalized = normalizeSize(trimmed);
    if (normalized) sizes.push(normalized);
  }

  return {
    colors: dedupeStrings([...colors]),
    sizes:  dedupeStrings(sizes),
  };
}

/** Build structured color_variants JSONB from a string array */
function buildColorVariants(colorNames) {
  return colorNames.map(name => ({
    name,
    hex:      COLOR_HEX[name] || null,
    in_stock: true,
  }));
}

/** Build structured size_variants JSONB from a string array */
function buildSizeVariants(sizeLabels) {
  return sizeLabels.map(label => ({
    label,
    in_stock: true,
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍  Fetching all products...");

  // Fetch in batches to handle large tables
  const PAGE = 500;
  let allProducts = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, available_colors, available_sizes")
      .range(from, from + PAGE - 1);

    if (error) { console.error("❌  Fetch error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`📦  ${allProducts.length} products loaded.\n`);

  let updated     = 0;
  let skipped     = 0;
  let errorCount  = 0;
  const changes   = [];

  for (const product of allProducts) {
    const { colors: newColors, sizes: newSizes } = normalizeProduct(
      product.available_colors,
      product.available_sizes,
    );

    // Check if anything changed (deep compare as sorted strings)
    const oldColors = [...(product.available_colors || [])].sort().join("|");
    const oldSizes  = [...(product.available_sizes  || [])].sort().join("|");
    const updColors = [...newColors].sort().join("|");
    const updSizes  = [...newSizes].sort().join("|");

    if (oldColors === updColors && oldSizes === updSizes) {
      skipped++;
      continue;
    }

    changes.push({
      name:      product.name,
      id:        product.id,
      colorsBefore: product.available_colors,
      colorsAfter:  newColors,
      sizesBefore:  product.available_sizes,
      sizesAfter:   newSizes,
    });

    const { error } = await supabase
      .from("products")
      .update({
        available_colors: newColors,
        available_sizes:  newSizes,
        color_variants:   buildColorVariants(newColors),
        size_variants:    buildSizeVariants(newSizes),
      })
      .eq("id", product.id);

    if (error) {
      console.error(`  ❌  ${product.name}: ${error.message}`);
      errorCount++;
    } else {
      updated++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("────────────────────────────────────────────");
  console.log(`✅  Updated:  ${updated}`);
  console.log(`⏭   Skipped:  ${skipped} (no changes needed)`);
  console.log(`❌  Errors:   ${errorCount}`);
  console.log("────────────────────────────────────────────");

  if (changes.length > 0) {
    console.log("\n📋  Changed products:\n");
    for (const c of changes) {
      const addedColors   = c.colorsAfter.filter(v => !(c.colorsBefore || []).includes(v));
      const removedColors = (c.colorsBefore || []).filter(v => !c.colorsAfter.includes(v));
      const addedSizes    = c.sizesAfter.filter(v => !(c.sizesBefore || []).includes(v));
      const removedSizes  = (c.sizesBefore || []).filter(v => !c.sizesAfter.includes(v));

      console.log(`  ${c.name}`);
      if (addedColors.length)   console.log(`    + Colors:  ${addedColors.join(", ")}`);
      if (removedColors.length) console.log(`    - Colors:  ${removedColors.join(", ")}`);
      if (addedSizes.length)    console.log(`    + Sizes:   ${addedSizes.join(", ")}`);
      if (removedSizes.length)  console.log(`    - Sizes:   ${removedSizes.join(", ")}`);
    }
  }
}

main();

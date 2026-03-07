-- BADU E-commerce Full Database Schema
-- To be executed in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------
-- 1. CATALOG & PRODUCTS
---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_ghs numeric DEFAULT 300.00,
  category_type text DEFAULT 'footwear'::text,
  image_urls text[], -- Assuming text array for Supabase
  inventory_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

---------------------------------------------------
-- 2. ORDERS & TRANSACTIONS
---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  first_name text,
  last_name text,
  total_amount numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  paystack_reference text UNIQUE,
  shipping_address jsonb,
  is_custom_order boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);

---------------------------------------------------
-- 3. CUSTOM REQUESTS (Tailor/Bespoke)
---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name text,
  last_name text,
  email text,
  strap_color text,
  sole_tone text,
  stitch_refinement text,
  status text DEFAULT 'inquiry'::text,
  request_type text DEFAULT 'bespoke',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT custom_requests_pkey PRIMARY KEY (id)
);

---------------------------------------------------
-- 4. FINANCE (Invoices & Pay Links)
---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type IN ('invoice', 'quotation')),
  amount numeric NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status IN ('pending', 'paid', 'draft', 'cancelled')),
  customer_id uuid, -- Optional, can map to a formal users table later
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);

---------------------------------------------------
-- 5. CRM (Leads & Contacts)
---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT newsletter_subs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_inquiries_pkey PRIMARY KEY (id)
);

---------------------------------------------------
-- 6. SEO MANAGEMENT
---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_metadata (
  page_path text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  og_image_url text,
  keywords text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_metadata_pkey PRIMARY KEY (page_path)
);

---------------------------------------------------
-- 7. CONTENT MANAGEMENT (CMS)
---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_assets (
  section_key text NOT NULL UNIQUE,
  image_url text,
  alt_text text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_assets_pkey PRIMARY KEY (section_key)
);

-- Insert initial placeholder data for the CMS
INSERT INTO public.site_assets (section_key, image_url, alt_text) VALUES
('home_hero', 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?q=80&w=2560&auto=format&fit=crop', 'Badu Ghanaian Leather Footwear - Hero Image'),
('gallery_img_1', 'https://images.unsplash.com/photo-1610963197825-f71e98950d87?q=80&w=1000&auto=format&fit=crop', 'Badu Ghanaian Leather Footwear - Leather Craft and Stitching'),
('gallery_img_2', 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=1000&auto=format&fit=crop', 'Badu Ghanaian Leather Footwear - Macro Leather Texture'),
('gallery_img_3', 'https://images.unsplash.com/photo-1531604250646-2f0e818c4f06?q=80&w=1000&auto=format&fit=crop', 'Badu Ghanaian Leather Footwear - Minimalist Architecture Space'),
('gallery_img_4', 'https://images.unsplash.com/photo-1618220179428-22790b46a0eb?q=80&w=1000&auto=format&fit=crop', 'Badu Ghanaian Leather Footwear - Warm Tones and Abstract Design'),
('craft_img_1', 'https://images.unsplash.com/photo-1610963197825-f71e98950d87?q=80&w=1000&auto=format&fit=crop', 'Badu Ghanaian Leather Footwear - Leather Craft and Stitching'),
('craft_img_2', 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=1000&auto=format&fit=crop', 'Badu Ghanaian Leather Footwear - Macro Leather Texture'),
('craft_img_3', 'https://images.unsplash.com/photo-1531604250646-2f0e818c4f06?q=80&w=1000&auto=format&fit=crop', 'Badu Ghanaian Leather Footwear - Minimalist Architecture Space')
ON CONFLICT (section_key) DO NOTHING;

---------------------------------------------------
-- 8. STORAGE BUCKETS (MANUAL SETUP REQUIRED)
---------------------------------------------------
-- 1. Go to your Supabase Dashboard -> Storage
-- 2. Click "New Bucket" and name it strictly: site-assets
-- 3. Mark the bucket as "Public" during creation.
-- 4. Under "Policies" for the site-assets bucket, click "New Policy".
-- 5. Create a policy for "SELECT": Allow anyone (anon) to select (read) files.
-- 6. Create a policy for "INSERT" & "UPDATE": Allow authenticated users to upload/update files.

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.back_in_stock_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid,
  email text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'notified'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT back_in_stock_requests_pkey PRIMARY KEY (id),
  CONSTRAINT back_in_stock_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.business_settings (
  id text NOT NULL DEFAULT 'default'::text,
  business_name text NOT NULL DEFAULT 'Miss Tokyo'::text,
  email text DEFAULT 'orders@misstokyo.shop'::text,
  contact text DEFAULT '055 389 8704'::text,
  address text DEFAULT 'Dome Road Accra Ghana'::text,
  logo_url text,
  tax_rate numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contact_inquiries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_inquiries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT ''::text,
  email text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'manual'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['fixed'::text, 'percentage'::text, 'free_shipping'::text, 'sale_price'::text, 'buy_x_get_y'::text])),
  discount_value numeric NOT NULL,
  min_order_value numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  usage_limit integer,
  used_count integer DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  buy_quantity integer,
  get_quantity integer,
  free_shipping boolean DEFAULT false,
  target_category_id uuid,
  single_use_per_customer boolean DEFAULT false,
  CONSTRAINT coupons_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_target_category_id_fkey FOREIGN KEY (target_category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.custom_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_name text,
  customer_email text,
  customizations jsonb,
  status text DEFAULT 'inquiry'::text,
  details text,
  reference_product text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT custom_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gift_cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  initial_value numeric NOT NULL,
  remaining_value numeric NOT NULL,
  recipient_email text,
  recipient_name text,
  sender_name text,
  message text,
  delivery_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gift_cards_pkey PRIMARY KEY (id)
);
CREATE TABLE public.newsletter_subs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT newsletter_subs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_email text NOT NULL,
  customer_name text,
  customer_phone text,
  total_amount numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  paystack_reference text UNIQUE,
  shipping_address jsonb,
  delivery_method text,
  items jsonb DEFAULT '[]'::jsonb,
  is_custom_order boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.pay_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  amount numeric NOT NULL,
  description text,
  paystack_url text,
  paystack_reference text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pay_links_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_ghs numeric NOT NULL,
  compare_at_price_ghs numeric,
  category_id uuid,
  image_urls ARRAY,
  inventory_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  available_sizes ARRAY,
  available_colors ARRAY,
  sort_order integer DEFAULT 0,
  sale_subtext text,
  media jsonb DEFAULT '[]'::jsonb,
  is_sale boolean DEFAULT false,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text DEFAULT 'customer'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'sales_staff'::text, 'customer'::text])),
  created_at timestamp with time zone DEFAULT now(),
  full_name text,
  phone text,
  default_address jsonb,
  first_name text,
  last_name text,
  address_region text,
  address_street text,
  email_subscribed boolean DEFAULT false,
  sms_subscribed boolean DEFAULT false,
  country text,
  acquisition_source text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.site_assets (
  section_key text NOT NULL,
  image_url text,
  alt_text text,
  label text,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_assets_pkey PRIMARY KEY (section_key)
);
CREATE TABLE public.site_copy (
  copy_key text NOT NULL,
  label text NOT NULL,
  page_group text NOT NULL DEFAULT 'general'::text,
  value text NOT NULL DEFAULT ''::text,
  hint text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT site_copy_pkey PRIMARY KEY (copy_key)
);
CREATE TABLE public.site_metadata (
  page_path text NOT NULL,
  title text NOT NULL,
  description text,
  og_image_url text,
  keywords text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_metadata_pkey PRIMARY KEY (page_path)
);
CREATE TABLE public.store_settings (
  id text NOT NULL DEFAULT 'default'::text,
  global_sizes ARRAY DEFAULT ARRAY['XS'::text, 'S'::text, 'M'::text, 'L'::text, 'XL'::text, 'XXL'::text],
  enable_store_pickup boolean DEFAULT true,
  global_colors ARRAY DEFAULT ARRAY['Black'::text, 'White'::text, 'Red'::text, 'Pink'::text, 'Nude'::text, 'Navy'::text],
  maintenance_mode boolean DEFAULT false,
  home_grid_cols integer NOT NULL DEFAULT 4,
  shop_grid_cols integer NOT NULL DEFAULT 4,
  home_product_limit integer NOT NULL DEFAULT 8,
  CONSTRAINT store_settings_pkey PRIMARY KEY (id)
);


#Below are the DB Policies 

[
  {
    "schemaname": "public",
    "tablename": "back_in_stock_requests",
    "policyname": "Public can insert back in stock requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "back_in_stock_requests",
    "policyname": "Admins full access back in stock",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "business_settings",
    "policyname": "Admins have full access to business_settings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "business_settings",
    "policyname": "Allow public read access to business settings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "categories",
    "policyname": "Allow public read access to active categories",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_active = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "categories",
    "policyname": "Admins have full access to categories",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "contact_inquiries",
    "policyname": "Allow public inserts for contact inquiries",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "contact_inquiries",
    "policyname": "Admins have full access to contact_inquiries",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "contacts",
    "policyname": "Admin Contacts Access",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "contacts",
    "policyname": "Admins have full access to contacts",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "coupons",
    "policyname": "Public can view active coupons",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_active = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "coupons",
    "policyname": "Admins full access coupons",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "custom_requests",
    "policyname": "Admins have full access to custom_requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "custom_requests",
    "policyname": "Allow public inserts for custom requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "gift_cards",
    "policyname": "Admins have full access to gift_cards",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "newsletter_subs",
    "policyname": "Allow public inserts for newsletter",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "newsletter_subs",
    "policyname": "Admins have full access to newsletter_subs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "orders",
    "policyname": "Admins have full access to orders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "orders",
    "policyname": "Users can view their own orders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "orders",
    "policyname": "Allow public inserts for orders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "pay_links",
    "policyname": "Admins have full access to pay_links",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "Allow public read access to active products",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_active = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "Admins have full access to products",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "Enable read access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "Users can update their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "Admins have full access to profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "site_assets",
    "policyname": "Allow public read access to active site assets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_active = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "site_assets",
    "policyname": "Admins have full access to site_assets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "site_copy",
    "policyname": "Allow public read access to site copy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "site_copy",
    "policyname": "Admins have full access to site_copy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "site_metadata",
    "policyname": "Allow public read access to site metadata",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "site_metadata",
    "policyname": "Admins have full access to site_metadata",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "store_settings",
    "policyname": "Admin Settings Access",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "store_settings",
    "policyname": "Admins have full access to store_settings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "store_settings",
    "policyname": "Allow public read access to store settings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  }
]
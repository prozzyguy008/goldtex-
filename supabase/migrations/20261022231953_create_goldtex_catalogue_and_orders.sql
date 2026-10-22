/*
# Create Goldtex catalogue, audit, and order storage

1. New Tables
- `products`: public product identity, catalogue details, selling price, and merchandising fields. The source cost is stored separately from public storefront reads.
- `product_sources`: filename, page, source description, source cost, import run, and reconciliation status for traceability.
- `product_images`: image URL and verification metadata for each product.
- `import_runs`: source inventory and extraction/reconciliation totals.
- `orders`: customer checkout details and server-computed totals.
- `order_items`: immutable product snapshots attached to orders.

2. Security
- Enable RLS on every table.
- Public storefront can read only published product fields and verified image records.
- Supplier source costs are not granted to anon or authenticated storefront roles.
- Customers may create orders through the public order placement function; order totals are calculated from the catalogue on the server.
- Admin-oriented source and audit tables are restricted to service_role.

3. Important Notes
- No customer sign-in is added in this release, so storefront reads use anon access.
- Products without a valid source cost retain a null selling price and display Price on request.
- The deterministic selling-price rule is round(cost * 1.10) and is applied during import.
*/

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  brand text,
  category text NOT NULL,
  subcategory text,
  model text,
  display_name text NOT NULL,
  original_description text NOT NULL,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_cost numeric(14,2),
  selling_price integer,
  price_status text NOT NULL DEFAULT 'on_request' CHECK (price_status IN ('priced','on_request')),
  published boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  source_filename text NOT NULL,
  source_page integer NOT NULL,
  source_row text NOT NULL,
  source_description text,
  source_model text,
  source_cost numeric(14,2),
  status text NOT NULL DEFAULT 'imported' CHECK (status IN ('imported','duplicate','unresolved','excluded','unreadable')),
  status_reason text,
  import_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  source_page_url text,
  source_domain text,
  matched_model text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('exact_verified','same_product_verified','pending','unresolved','broken','unavailable')),
  verification_notes text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, image_url)
);

CREATE TABLE IF NOT EXISTS public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  source_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  pages_inspected integer NOT NULL DEFAULT 0,
  source_rows_extracted integer NOT NULL DEFAULT 0,
  valid_unique_products integer NOT NULL DEFAULT 0,
  duplicate_records integer NOT NULL DEFAULT 0,
  unresolved_records integer NOT NULL DEFAULT 0,
  unreadable_pages integer NOT NULL DEFAULT 0,
  report_path text
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  delivery_address text NOT NULL,
  delivery_notes text,
  delivery_method text NOT NULL DEFAULT 'To be confirmed',
  payment_method text NOT NULL DEFAULT 'Pay on confirmation',
  subtotal integer NOT NULL CHECK (subtotal >= 0),
  delivery_fee integer NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total integer NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','ready','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  model text,
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  line_total integer NOT NULL CHECK (line_total >= 0)
);

ALTER TABLE public.product_sources DROP CONSTRAINT IF EXISTS product_sources_import_run_id_fkey;
ALTER TABLE public.product_sources ADD CONSTRAINT product_sources_import_run_id_fkey FOREIGN KEY (import_run_id) REFERENCES public.import_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS products_brand_idx ON public.products(brand);
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products(selling_price);
CREATE INDEX IF NOT EXISTS products_search_idx ON public.products USING gin (to_tsvector('simple', coalesce(display_name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(model,'') || ' ' || coalesce(original_description,'')));
CREATE INDEX IF NOT EXISTS product_images_product_idx ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS product_sources_file_page_idx ON public.product_sources(source_filename, source_page);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.products FROM anon, authenticated;
GRANT SELECT (id, source_key, brand, category, subcategory, model, display_name, original_description, specifications, selling_price, price_status, published, featured, created_at, updated_at) ON public.products TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_published_products" ON public.products;
CREATE POLICY "public_read_published_products" ON public.products FOR SELECT TO anon, authenticated USING (published = true);

REVOKE ALL ON public.product_images FROM anon, authenticated;
GRANT SELECT (id, product_id, image_url, source_page_url, source_domain, matched_model, verification_status, verification_notes, last_checked_at, created_at) ON public.product_images TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_verified_images" ON public.product_images;
CREATE POLICY "public_read_verified_images" ON public.product_images FOR SELECT TO anon, authenticated USING (verification_status IN ('exact_verified','same_product_verified'));

REVOKE ALL ON public.product_sources FROM anon, authenticated;
REVOKE ALL ON public.import_runs FROM anon, authenticated;
GRANT ALL ON public.products, public.product_sources, public.product_images, public.import_runs TO service_role;

REVOKE ALL ON public.orders FROM anon, authenticated;
REVOKE ALL ON public.order_items FROM anon, authenticated;
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT INSERT ON public.order_items TO anon, authenticated;
DROP POLICY IF EXISTS "public_create_orders" ON public.orders;
CREATE POLICY "public_create_orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_create_order_items" ON public.order_items;
CREATE POLICY "public_create_order_items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders, public.order_items TO service_role;

CREATE OR REPLACE FUNCTION public.place_goldtex_order(
  p_customer_name text,
  p_phone text,
  p_delivery_address text,
  p_delivery_notes text,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_subtotal integer := 0;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_qty integer;
  v_line integer;
BEGIN
  IF length(trim(p_customer_name)) < 2 OR length(trim(p_phone)) < 7 OR length(trim(p_delivery_address)) < 8 THEN
    RAISE EXCEPTION 'Invalid checkout details';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Invalid order items';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty < 1 OR v_qty > 100 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::uuid AND published = true;
    IF NOT FOUND OR v_product.selling_price IS NULL THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    v_line := v_product.selling_price * v_qty;
    v_subtotal := v_subtotal + v_line;
  END LOOP;
  INSERT INTO orders(customer_name, phone, delivery_address, delivery_notes, subtotal, total)
  VALUES (trim(p_customer_name), trim(p_phone), trim(p_delivery_address), nullif(trim(p_delivery_notes), ''), v_subtotal, v_subtotal)
  RETURNING id INTO v_order_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::integer;
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::uuid;
    INSERT INTO order_items(order_id, product_id, product_name, model, unit_price, quantity, line_total)
    VALUES (v_order_id, v_product.id, v_product.display_name, v_product.model, v_product.selling_price, v_qty, v_product.selling_price * v_qty);
  END LOOP;
  RETURN v_order_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.place_goldtex_order(text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_goldtex_order(text,text,text,text,jsonb) TO anon, authenticated;

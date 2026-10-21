-- Content › the shop: make the saved content equal what the live shop shows,
-- before the shop starts reading it. Data only, additive, re-runnable: every
-- statement fills a missing row or changes one exact never-shown value, so a
-- second run (or a value the owner has changed since) is left alone. No row
-- is deleted.
--
-- Before this migration the shop ignored every value changed here, so
-- applying it changes nothing customers see. After the wiring ships, the shop
-- reads these rows and still looks exactly as it did.

-- 1. Home page › New arrivals.
--    Live: the 16 newest active products, no category filter, titled
--    "New Arrivals", one list (no tabs).
--    Saved before (never shown): limit 12, only category
--    3fb9aad9-ea2e-42f6-9289-a33aa19906c5 ("New Arrivals"), title "New Arrivals".
--    To restore the old saved values:
--      update site_settings set homepage_new_arrivals_limit = 12,
--        homepage_new_arrivals_category_id = '3fb9aad9-ea2e-42f6-9289-a33aa19906c5'
--      where id = 'singleton';
update site_settings
   set homepage_new_arrivals_limit = 16,
       homepage_new_arrivals_category_id = null
 where id = 'singleton'
   and homepage_new_arrivals_limit = 12
   and homepage_new_arrivals_category_id = '3fb9aad9-ea2e-42f6-9289-a33aa19906c5';

update site_settings
   set homepage_new_arrivals_title = 'New Arrivals'
 where id = 'singleton'
   and (homepage_new_arrivals_title is null or btrim(homepage_new_arrivals_title) = '');

--    Carousel tabs: no row was saved (the old editor showed two default tabs,
--    "New In" and "Bestsellers", that the shop never rendered). One tab = the
--    one list the shop shows, with no tab buttons.
insert into site_copy (copy_key, label, page_group, value, hint)
values ('carousel_config', 'Homepage carousel tabs', 'homepage',
        '{"tabs":[{"label":"New In","mode":"newest","category_name":""}]}',
        'Tabs on the home page New Arrivals carousel')
on conflict (copy_key) do nothing;

-- 2. Shop wording the pages now read. No rows existed; each gets the text the
--    page shows today (its built-in original).
insert into site_copy (copy_key, label, page_group, value, hint) values
  ('craft_heritage_heading', 'Heritage heading', 'craft', $t$The Name Is Personal$t$, 'The Craft page, section 01'),
  ('craft_heritage_body', 'Heritage text', 'craft', $t$MISS TOKYO is more than a label; it is a lineage. Born in Accra, our atelier honors the artisanal legacy of Ghana by refusing the shortcuts of mass production. Every stitch is a deliberate act of preservation.$t$, 'The Craft page, section 01'),
  ('craft_philosophy_heading', 'Philosophy heading', 'craft', $t$Visual Silence$t$, 'The Craft page, section 02'),
  ('craft_philosophy_body', 'Philosophy text', 'craft', $t$We strip away the extraneous to leave only the essential structure. True luxury is found in the quiet details: unbranded surfaces, perfectly skived edges, and leathers selected to age alongside you. Elegance is refusal.$t$, 'The Craft page, section 02'),
  ('home_new_arrivals_eyebrow', 'New arrivals small heading', 'homepage', $t$JUST LANDED$t$, 'Above the New Arrivals title on the home page'),
  ('home_new_arrivals_link', 'New arrivals link', 'homepage', $t$VIEW ALL$t$, 'The link to the shop beside the New Arrivals title')
on conflict (copy_key) do nothing;

-- 3. Home page › Customer reviews: which reviews the home page shows.
--    Live: the Transparent Turtle widget. "own" would show homepage_reviews.
insert into site_copy (copy_key, label, page_group, value, hint)
values ('homepage_reviews_source', 'Home page reviews', 'homepage', 'widget',
        'widget = Transparent Turtle widget, own = the reviews in Content › Reviews')
on conflict (copy_key) do nothing;

-- 4. Menu › Gallery. The shop's menu ignored store_settings.enable_gallery, so
--    the Gallery link and the /gallery page have been showing and working
--    while the switch said off. The menu now respects the switch; to keep the
--    link customers see today, the switch is set to what is live.
--    Saved before: enable_gallery = false. To hide the link after the wiring
--    ships, turn Gallery off in Settings › Shop pages (or restore with
--    update store_settings set enable_gallery = false where id = 'default';).
update store_settings set enable_gallery = true
 where id = 'default' and enable_gallery = false;

-- 5. /shop search-engine text. Live /shop outputs the page's own title and
--    description and inherits the home page's share image.
--    Saved before (never shown):
--      title       'Miss Tokyo Shop'
--      description E'Miss Tokyo — Fashion,\nDome Road Accra Ghana'
--      keywords    ''
--      og_image_url 'https://wcygtmcnysbhzgcicocm.supabase.co/storage/v1/object/public/site-assets/og-images/1776840441485-m9xox9.webp'
--    To restore:
--      update site_metadata set title = 'Miss Tokyo Shop', description = E'Miss Tokyo — Fashion,\nDome Road Accra Ghana',
--        og_image_url = 'https://wcygtmcnysbhzgcicocm.supabase.co/storage/v1/object/public/site-assets/og-images/1776840441485-m9xox9.webp'
--      where page_path = '/shop';
update site_metadata
   set title = 'Shop — Miss Tokyo',
       description = 'Browse 240+ styles — dresses, tops, sets, activewear and more. New drops weekly. Free delivery in Accra on orders over GH₵150.',
       og_image_url = null,
       updated_at = now()
 where page_path = '/shop'
   and title = 'Miss Tokyo Shop'
   and og_image_url = 'https://wcygtmcnysbhzgcicocm.supabase.co/storage/v1/object/public/site-assets/og-images/1776840441485-m9xox9.webp';

-- 6. Site images. The gift cards page now shows gift_card_hero behind its
--    hero when the image is switched on. The saved image was never shown, so
--    it is kept but switched off (is_active), which is what customers see now.
--    Saved before: is_active = true,
--      image_url 'https://wcygtmcnysbhzgcicocm.supabase.co/storage/v1/object/public/site-assets/banners/1773724777203-crc6b7.webp'
--    To show it: update site_assets set is_active = true where section_key = 'gift_card_hero';
update site_assets set is_active = false, updated_at = now()
 where section_key = 'gift_card_hero'
   and is_active = true
   and image_url = 'https://wcygtmcnysbhzgcicocm.supabase.co/storage/v1/object/public/site-assets/banners/1773724777203-crc6b7.webp';

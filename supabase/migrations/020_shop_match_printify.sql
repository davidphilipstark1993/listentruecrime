-- Aligns the shop catalogue with the products that actually exist in the
-- "Listen True Crime" Printify shop (checked 26 Oct 2026). Replaces the seven
-- placeholder products from 018 with the six real ones. The Comfort Colors
-- tee made by Printify Choice (Miami) is deliberately NOT included.
--
-- Safe to run: the placeholders had no Printify ids and could not be bought, so
-- no order rows reference them. Variants (ids, costs, mock-ups) are NOT created
-- here — run "Pull variants from Printify" on each product in /admin/shop/products,
-- then set each variant's price. Products stay placeholders until you tick
-- "not a placeholder", so nothing is buyable yet.

delete from public.shop_products
where printify_product_id is null
  and slug in (
    'professional-armchair-detective-tshirt',
    'my-search-history-needs-an-alibi-tshirt',
    'coffee-crime-and-conspiracies-tshirt',
    'true-crime-is-my-comfort-zone-tshirt',
    'professional-armchair-detective-hoodie',
    'listen-true-crime-hoodie',
    'listen-true-crime-mug'
  );

insert into public.shop_products
  (slug, title, category, short_description, description, printify_product_id, is_published, is_featured, is_new, sort_order, seo_title, seo_description, admin_notes)
values
  ('listen-true-crime-podcast-graphic-tshirt',
   'Listen True Crime Podcast Graphic T-Shirt', 't-shirts',
   'Graphic tee from the Listen True Crime podcast directory. Printed to order in the UK.',
   null, '6ad7b737f2ea03930f046466', true, true, true, 1,
   'Listen True Crime Podcast Graphic T-Shirt | True Crime T-Shirts UK',
   'A graphic true crime T-shirt from Listen True Crime. Printed to order in the UK.',
   'Printify: T Shirt and Sons (UK), Gildan 64000. Pull variants, set prices, add description/size guide.'),
  ('listen-true-crime-typography-sweatshirt',
   'Listen True Crime Typography Sweatshirt', 'hoodies',
   'Typography sweatshirt from Listen True Crime. Printed to order in the UK.',
   null, '6ad7b897edf2f395760c23f8', true, true, false, 2,
   'Listen True Crime Typography Sweatshirt | True Crime Sweatshirts UK',
   'A true crime typography sweatshirt from Listen True Crime. Printed to order in the UK.',
   'Printify: Shirt Monkey (UK), Gildan 18000. Category slug is hoodies (shown as Sweatshirts).'),
  ('listen-to-true-crime-podcast-black-coffee-mug',
   'Listen to True Crime Podcast Mug, Black Coffee Mug', 'mugs',
   'Black coffee mug for true crime listeners. Printed to order in the UK.',
   null, '6ad7bfca98756e96550fc2b7', true, false, false, 3,
   'Listen to True Crime Podcast Black Coffee Mug | True Crime Gifts UK',
   'A black coffee mug for true crime podcast fans. Printed to order in the UK.',
   'Printify: Harrier (UK). Printify lists 9 colours — disable any you do not want to sell.'),
  ('trust-no-one-except-my-husband-quote-mug',
   'Trust No One Except My Husband Quote Mug', 'mugs',
   'Quote mug for true crime fans. Printed to order in the UK.',
   null, '6ad9082ab6f6f5543f0420c1', true, false, false, 4,
   'Trust No One Except My Husband Quote Mug | True Crime Gifts UK',
   'A true crime quote mug. Printed to order in the UK.',
   'Printify: Harrier (UK). Flagged personalisable in Printify. 9 colours — disable any you do not want to sell.'),
  ('true-crime-podcast-typography-water-bottle',
   'True Crime Podcast Typography Water Bottle', 'accessories',
   'Typography water bottle for true crime listeners. Printed to order.',
   null, '6ad7be6bf2ea03930f046d71', true, false, false, 5,
   'True Crime Podcast Typography Water Bottle | True Crime Gifts UK',
   'A true crime podcast typography water bottle. Printed to order.',
   'Printify: WOYC. CHECK provider location/shipping to the UK before enabling.'),
  ('true-crime-junkie-embroidered-beanie',
   'True Crime Junkie Embroidered Beanie', 'accessories',
   'Embroidered beanie. Printed to order.',
   null, '6ad7bd47c7280d399b0028cf', false, false, false, 6,
   'Embroidered Beanie | True Crime Merchandise UK',
   'An embroidered beanie from Listen True Crime. Made to order.',
   'HIDDEN. Title copies Printify but "True Crime Junkie" is another podcast — rename in Printify and here before publishing. Provider: Printful (check UK shipping).');

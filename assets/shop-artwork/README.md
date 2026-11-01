# Shop artwork and catalogue pipeline

Everything for the merchandise range is generated from code, so it can be changed and re-run.

| Step | Command | What it does |
|---|---|---|
| 1. Artwork | `node scripts/shop/artwork/generate.mjs` | Renders every design in `scripts/shop/artwork/designs.mjs` to `designs/<slug>/design.svg` (editable) and `design.png` (transparent, 3600px wide, print-ready), plus contact sheets in `designs/_preview/`. Text is typeset from the fonts in `fonts/` (Playfair Display, Inter, Courier Prime, all SIL OFL), so slogans are always spelled correctly. |
| 2. Printify | `node scripts/shop/catalogue/create-printify-products.mjs` | Uploads the print files and creates draft products on UK print providers. Matched by title, so it never duplicates. `--update-placement` re-applies print sizes to existing products. Needs `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID`. |
| 3. Shop | `node scripts/shop/catalogue/populate-shop.mjs` | Adds the products to the shop database as drafts. Needs migration `021_shop_collections.sql` and the Supabase service-role key. Re-runs refresh copy and costs but never overwrite prices, images or published flags. |
| 4. Verify | `node scripts/shop/catalogue/verify-and-publish.mjs` | Report-only check of fulfilment mapping, prices, margins, images, SEO fields and a real Printify UK delivery quote. `--mark-verified` clears the placeholder flag on passing products; `--publish` also makes them visible. |

The range itself (which design goes on which product, copy, prices and print sizes) lives in `scripts/shop/catalogue/range.mjs`.

To add a design: add an entry to `designs.mjs`, add its copy and product types to `range.mjs`, then run steps 1 to 4.

Artwork rules: dark, editorial, cream type with one dark-red accent, no third-party logos or characters, nothing exploiting real victims or cases.

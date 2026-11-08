# Incomplete podcast records (for editorial review)

Generated 8 November 2026 by `node scripts/seo/incomplete-records-report.mjs` (read-only). Row-level list: [`data/incomplete-podcast-records.csv`](./data/incomplete-podcast-records.csv), Must listen shows first. Nothing here was filled in or inferred.

| Gap (775 published) | Count |
|---|---:|
| No editorial verdict | 59 |
| No Binge Factor | 70 |
| No artwork | 163 |
| No best episode to start | 103 |
| No short description | 3 |
| No country | 15 |
| No case types | 22 |
| No format | 54 |
| No host name | 641 |
| No "if you liked this" picks | 282 |
| No newsletter summary | 52 |
| No custom SEO title/description | 731 |
| Summary text with award/popularity wording to verify | 58 |
| **No editor rating (`rating`)** | **775** |

**Highest-value fixes:** (1) verdict and Binge Factor for the 112 Must listen rows with gaps, since they feed the best page; (2) best-episode-to-start; (3) artwork; (4) verify the 58 summaries with award/ranking/download claims (the best page deliberately omits them; podcast pages still show them).

**Taxonomy clean-up:** case types differ only by case (Cold case/Cold Case, Missing person/Missing Person, Serial killer/Serial Killer, Organised crime/Organised Crime, Wrongful conviction/Wrongful Conviction, Cover-up/Cover-Up, Child abduction/Child Abduction); format has `Serialized` (153) and `Serialised` (68). Code now tolerates both; normalising the data is still tidier.

**Structural gaps (need a decision, not data entry):** no per-show strengths/weaknesses fields; no `last_reviewed_at` column (pages show "Listing updated" from `updated_at`, which automated artwork jobs also touch); no content-intensity field; no "still releasing" flag; no editor `rating`, so no `Review` schema; 0 podcasts with ≥3 community ratings.

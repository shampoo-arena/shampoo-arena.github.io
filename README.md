# Shampoo Arena

**Live site: <https://shampoo-arena.github.io>**

Every shampoo sold on dm.cz, ranked separately for each hair type by its ingredient list alone.

LLM judges compare the INCI lists of two shampoos at a time, without seeing the brand, the
product name or the price. A Bradley–Terry model then turns thousands of these pairwise verdicts
into a ranking for each hair type, with a 95% confidence interval on every score. The site's
[How it works](https://shampoo-arena.github.io/about/) page explains the method and what it
cannot tell you.

## This repository is generated

Everything here is a static export written by `shampoo-arena export`: plain HTML and CSS, with no
server and no build step. Do not edit these files by hand. The next export replaces everything
except `.git` and `CNAME`, so manual changes are lost.

| Path | Contents |
|---|---|
| `index.html` | Leaderboard: every shampoo against every hair type |
| `sort/…`, `show/…` | The same leaderboard sorted by another column, or showing scores instead of ranks |
| `profile/<hair-type>/` | Full ranking for one hair type |
| `effects/<hair-type>/` | Which ingredients the judges favoured for that hair type |
| `diagnostics/<hair-type>/` | Judge consistency: position bias and contradictory verdicts |
| `product/<id>/` | One shampoo: its standings and full ingredient list |
| `comparisons/<hair-type>/<id>/` | The verdicts behind one shampoo's ranking, loaded on its product page |

Product names, ingredient lists and prices come from dm.cz. Product images are loaded from dm's
own image servers and are not stored here. Nothing on this site is medical advice.

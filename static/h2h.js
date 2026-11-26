// Head-to-head tab on the product page. Each tab names one profile's verdict file
// (`/data/comparisons/<slug>.json`, shape documented on `comparisons_data` in web/app.py); this
// picks out the verdicts involving this product and renders them. The same code runs under
// `serve` and on the static site, so there is one implementation of this list.
(function () {
  "use strict";

  const box = document.getElementById("h2h");
  if (!box) return;
  const productId = Number(box.dataset.product);
  const tabs = Array.from(document.querySelectorAll(".h2h-tabs button[data-src]"));
  const files = new Map(); // src -> Promise of parsed data, so revisiting a tab costs nothing
  let wanted = null;

  function load(src) {
    if (!files.has(src)) {
      const request = fetch(src).then((response) => {
        if (!response.ok) throw new Error(`${src}: HTTP ${response.status}`);
        return response.json();
      });
      request.catch(() => files.delete(src)); // let a later click retry
      files.set(src, request);
    }
    return files.get(src);
  }

  // Build an element. Text always goes in as text: verdict reasons are model output.
  function el(tag, className, ...children) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    for (const child of children) {
      if (child !== null && child !== undefined && child !== "") node.append(child);
    }
    return node;
  }

  function figure(className, count, label) {
    return el("span", className, el("b", null, String(count)), ` ${label}`);
  }

  function bar(className, count, total) {
    const segment = el("i", className);
    segment.style.width = `${((count / total) * 100).toFixed(2)}%`;
    return segment;
  }

  function rowsFor(data) {
    const rows = [];
    for (const [a, b, winner, confidence, swapped, judge, factors] of data.verdicts) {
      if (a !== productId && b !== productId) continue;
      const isA = a === productId;
      const opponentId = isA ? b : a;
      const outcome = winner === 2 ? "tie" : (winner === 0) === isA ? "won" : "lost";
      rows.push({
        outcome,
        opponentId,
        opponent: data.products[opponentId] || null,
        confidence,
        factors: factors || [],
        // The reasons name formulations by the letter the model saw, and the presentation
        // order was randomised, so say which letter this product was.
        letter: isA !== Boolean(swapped) ? "A" : "B",
        judge: data.judges[judge] || "",
      });
    }
    const rank = (row) => (row.opponent && row.opponent.rank != null ? row.opponent.rank : 1e9);
    rows.sort((x, y) => rank(x) - rank(y)); // stable, so equal ranks keep verdict order
    return rows;
  }

  function duel(row) {
    const label = { won: "Won", lost: "Lost", tie: "Tie" }[row.outcome];
    const summary = el("summary", null, el("span", `outcome ${row.outcome}`, label), el("span", "vs", "vs"));

    const opp = row.opponent;
    if (opp) {
      const thumb = el("span", "thumb sm");
      if (opp.thumb) {
        const img = el("img");
        img.src = opp.thumb;
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        thumb.append(img);
      }
      const name = el("span", "duel-name", opp.name, el("span", "prod-brand", ` · ${opp.brand}`));
      summary.append(el("span", "duel-opp", thumb, name));
    } else {
      summary.append(el("span", "muted", "unknown product"));
    }
    summary.append(el("span", "duel-rank", opp && opp.rank != null ? `#${opp.rank}` : ""));

    const dots = el("span", "confidence");
    dots.title = `Judge's confidence: ${row.confidence || "?"} of 5`;
    for (let i = 0; i < 5; i++) dots.append(el("i", row.confidence && i < row.confidence ? "on" : ""));
    summary.append(dots);
    if (row.judge) summary.append(el("span", "judge-chip", row.judge));

    const shown = el("p", "muted", "This shampoo was shown as ", el("b", null, `formulation ${row.letter}`));
    // A ranked opponent always has its own page; an unranked one may not have been exported.
    if (opp && opp.rank != null) {
      const link = el("a", null, "open the opponent →");
      link.href = `/product/${row.opponentId}`;
      shown.append("; ", link);
    }
    const body = el("div", "duel-body", shown);
    if (row.factors.length) {
      body.append(el("ul", "factors", ...row.factors.map((f) => el("li", null, String(f)))));
    } else {
      body.append(el("p", "muted", "The judge gave no reasons for this verdict."));
    }
    return el("li", null, el("details", null, summary, body));
  }

  function render(data) {
    const rows = rowsFor(data);
    if (!rows.length) {
      box.replaceChildren(el("p", "empty", "No comparisons recorded for this hair type yet."));
      return;
    }
    const record = { won: 0, lost: 0, tie: 0 };
    for (const row of rows) record[row.outcome] += 1;
    const total = rows.length;

    const figures = el(
      "div",
      "record-figures",
      figure("w", record.won, "won"),
      figure("l", record.lost, "lost"),
      record.tie ? figure("t", record.tie, "tied") : null,
      el("span", "muted", `for ${data.profile.name.toLowerCase()}`)
    );
    const meter = el(
      "div",
      "record-bar",
      bar("w", record.won, total),
      bar("t", record.tie, total),
      bar("l", record.lost, total)
    );
    meter.setAttribute("aria-hidden", "true");

    // One list item per verdict can run to ~900 for a profile; appending in one go keeps it fast.
    const list = el("ul", "duels");
    const fragment = document.createDocumentFragment();
    for (const row of rows) fragment.append(duel(row));
    list.append(fragment);

    box.replaceChildren(el("div", "record", figures, meter), list);
  }

  async function select(tab) {
    for (const t of tabs) t.setAttribute("aria-selected", t === tab ? "true" : "false");
    const src = tab.dataset.src;
    wanted = src;
    box.classList.add("loading");
    try {
      const data = await load(src);
      if (wanted === src) render(data); // a later click wins over a slower earlier load
    } catch (error) {
      if (wanted === src) {
        box.replaceChildren(el("p", "empty", "Could not load the verdicts. Try the tab again."));
      }
      console.error(error);
    } finally {
      if (wanted === src) box.classList.remove("loading");
    }
  }

  for (const tab of tabs) tab.addEventListener("click", () => select(tab));
  const initial = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
  if (initial) select(initial);
})();

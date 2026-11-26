// Leaderboard sorting on the static site, where a host that ignores query strings cannot sort.
// State lives in the URL fragment (`/#sort=curly&show=score`, built by `views.static_url`). The
// row orders are computed in Python (`Leaderboard.orders`) and embedded in the page, so this only
// rearranges rows and can never order them differently from `serve`. Both cell modes are in the
// page; `.show-score` on #board picks one (see app.css).
(function () {
  "use strict";

  const board = document.getElementById("board");
  const blob = document.getElementById("board-data");
  const table = board && board.querySelector("table.board");
  if (!table || !blob) return;

  const { orders, labels } = JSON.parse(blob.textContent);
  const tbody = table.tBodies[0];
  const header = table.tHead.rows[0];
  const rows = new Map(Array.from(tbody.rows, (row) => [row.dataset.id, row]));
  const tag = document.getElementById("board-tag");
  const arrow = document.createElement("i");
  arrow.className = "arrow";
  arrow.textContent = "↓";

  function current() {
    const params = new URLSearchParams(location.hash.slice(1));
    const sort = Object.prototype.hasOwnProperty.call(labels, params.get("sort")) ? params.get("sort") : "avg";
    const show = params.get("show") === "score" ? "score" : "rank";
    return { sort, show };
  }

  function fragmentFor({ sort, show }) {
    const params = new URLSearchParams();
    if (sort !== "avg") params.set("sort", sort);
    if (show !== "rank") params.set("show", show);
    const text = params.toString();
    return text ? `#${text}` : "";
  }

  function apply() {
    const state = current();
    const order = orders[state.sort === "avg" ? `avg:${state.show}` : state.sort] || [];

    const reordered = document.createDocumentFragment();
    order.forEach((id, index) => {
      const row = rows.get(String(id));
      if (!row) return;
      row.cells[0].textContent = String(index + 1); // positions ignore search, as on `serve`
      reordered.append(row);
    });
    tbody.append(reordered);

    board.classList.toggle("show-score", state.show === "score");
    for (const link of document.querySelectorAll("a[data-sort]")) {
      link.classList.toggle("on", link.dataset.sort === state.sort);
    }
    for (const link of document.querySelectorAll("a[data-show]")) {
      link.setAttribute("aria-selected", link.dataset.show === state.show ? "true" : "false");
    }
    for (const old of header.querySelectorAll(".arrow")) old.remove();
    const sortedBy = header.querySelector(`a[data-sort="${CSS.escape(state.sort)}"]`);
    if (sortedBy) sortedBy.append(arrow);

    for (const cell of table.querySelectorAll(".sorted")) cell.classList.remove("sorted");
    const column = header.querySelector(`th[data-col="${CSS.escape(state.sort)}"]`);
    if (column) {
      column.classList.add("sorted");
      for (const row of tbody.rows) row.cells[column.cellIndex].classList.add("sorted");
    }

    if (tag) tag.textContent = labels[state.sort];
    // Switching judge loads another page; carry the sort over to it.
    for (const link of document.querySelectorAll("a[data-keep-hash]")) {
      link.hash = fragmentFor(state);
    }
  }

  // Merge a click into the current state rather than following the link, which was written for
  // the default state and would drop whichever of sort and show it does not name.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-sort], a[data-show]");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const state = current();
    if (link.dataset.sort) state.sort = link.dataset.sort;
    if (link.dataset.show) state.show = link.dataset.show;
    history.pushState(null, "", location.pathname + fragmentFor(state));
    apply();
  });
  window.addEventListener("popstate", apply);
  window.addEventListener("hashchange", apply);
  if (location.hash) apply();
})();

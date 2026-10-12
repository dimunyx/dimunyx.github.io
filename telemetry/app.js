/* Telemetry dashboard: pulls GoatCounter stats with a locally stored API token.
   Everything is vanilla, zero dependencies; the token never leaves the browser. */
(function () {
	"use strict";

	const TOKEN_KEY = "dimunyx-gc-token-v1";
	const API = "https://dimunyx.goatcounter.com/api/v0";

	const els = {};

	function cache() {
		for (const id of [
			"tele-connect",
			"tele-connect-form",
			"tele-token",
			"tele-connect-error",
			"tele-stats",
			"tele-period",
			"tele-disconnect",
			"kpi-visits",
			"kpi-today",
			"kpi-events",
			"kpi-peak",
			"tele-chart",
			"tele-chart-empty",
			"tele-pages",
			"tele-pages-empty",
			"tele-likes",
			"tele-likes-empty",
			"tele-errors",
			"tele-errors-empty",
			"tele-loading",
			"tele-fatal",
		]) {
			els[id] = document.getElementById(id);
		}
	}

	function getToken() {
		try {
			return localStorage.getItem(TOKEN_KEY) || "";
		} catch (error) {
			return "";
		}
	}

	function setToken(value) {
		try {
			if (value) localStorage.setItem(TOKEN_KEY, value);
			else localStorage.removeItem(TOKEN_KEY);
		} catch (error) {
			/* private mode: the session just won't persist the token */
		}
	}

	function show(node, visible) {
		if (node) node.hidden = !visible;
	}

	function message(node, text) {
		if (!node) return;
		node.textContent = text || "";
		show(node, Boolean(text));
	}

	function isoDaysAgo(days) {
		const date = new Date();
		date.setDate(date.getDate() - days);
		return date.toISOString();
	}

	function api(path) {
		return fetch(`${API}${path}`, {
			headers: {
				Authorization: `Bearer ${getToken()}`,
				"Content-Type": "application/json",
			},
		}).then(async (response) => {
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
			return body;
		});
	}

	function dayKey(date) {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	}

	function formatDay(day) {
		const [, month, date] = String(day).split("-");
		return `${month}/${date}`;
	}

	function fillKpis(total, hits) {
		els["kpi-visits"].textContent = String(total.total ?? 0);
		els["kpi-events"].textContent = String(total.total_events ?? 0);
		const today = dayKey(new Date());
		const days = Array.isArray(total.stats) ? total.stats : [];
		const todayStat = days.find((stat) => stat.day === today);
		els["kpi-today"].textContent = String(todayStat?.daily ?? 0);
		const peak = days.reduce((max, stat) => Math.max(max, stat.daily || 0), 0);
		els["kpi-peak"].textContent = String(peak);
		void hits;
	}

	function renderChart(total) {
		const chart = els["tele-chart"];
		chart.replaceChildren();
		const days = Array.isArray(total.stats) ? total.stats : [];
		if (!days.length) {
			show(els["tele-chart-empty"], true);
			return;
		}
		show(els["tele-chart-empty"], false);
		const peak = days.reduce((max, stat) => Math.max(max, stat.daily || 0), 0) || 1;
		for (const stat of days) {
			const bar = document.createElement("div");
			const value = stat.daily || 0;
			bar.className = `tele-chart__bar${value ? "" : " tele-chart__bar--empty"}`;
			bar.style.height = `${Math.max(4, Math.round((value / peak) * 100))}%`;
			bar.title = `${stat.day}: ${value}`;
			chart.append(bar);
		}
	}

	function listRow(name, count, max, extra) {
		const row = document.createElement("li");
		row.className = "tele-list__row";

		const label = document.createElement("span");
		label.className = "tele-list__name";
		label.textContent = name;
		label.title = name;
		row.append(label);

		if (typeof count === "number") {
			const track = document.createElement("span");
			track.className = "tele-list__bar";
			const fill = document.createElement("span");
			fill.className = "tele-list__bar-fill";
			fill.style.width = `${max ? Math.max(4, Math.round((count / max) * 100)) : 0}%`;
			track.append(fill);
			row.append(track);

			const value = document.createElement("span");
			value.className = "tele-list__count";
			value.textContent = String(count);
			row.append(value);
		}

		if (extra) row.append(extra);
		return row;
	}

	function renderPages(hits) {
		const list = els["tele-pages"];
		list.replaceChildren();
		const pages = hits
			.filter((hit) => !hit.event)
			.sort((a, b) => (b.count || 0) - (a.count || 0))
			.slice(0, 10);
		show(els["tele-pages-empty"], pages.length === 0);
		const max = pages[0]?.count || 0;
		for (const page of pages) list.append(listRow(page.path, page.count || 0, max));
	}

	function renderLikes(hits) {
		const list = els["tele-likes"];
		list.replaceChildren();
		const repos = new Map();
		for (const hit of hits) {
			if (!hit.event) continue;
			const match = /^(like|dislike)\/(.+)$/.exec(hit.path);
			if (!match) continue;
			const [, action, repo] = match;
			const entry = repos.get(repo) || { likes: 0, dislikes: 0 };
			if (action === "like") entry.likes += hit.count || 0;
			else entry.dislikes += hit.count || 0;
			repos.set(repo, entry);
		}
		const rows = [...repos.entries()].sort((a, b) => b[1].likes + b[1].dislikes - (a[1].likes + a[1].dislikes));
		show(els["tele-likes-empty"], rows.length === 0);
		for (const [repo, stat] of rows) {
			const extra = document.createElement("span");
			const up = document.createElement("span");
			up.className = `tele-like-stat tele-like-stat--up${stat.likes ? " is-active" : ""}`;
			up.textContent = `👍 ${stat.likes}`;
			const down = document.createElement("span");
			down.className = `tele-like-stat tele-like-stat--down${stat.dislikes ? " is-active" : ""}`;
			down.textContent = `👎 ${stat.dislikes}`;
			extra.append(up, down);
			list.append(listRow(repo, null, 0, extra));
		}
	}

	function renderErrors(hits) {
		const list = els["tele-errors"];
		list.replaceChildren();
		const errors = hits
			.filter((hit) => hit.event && hit.path.startsWith("error/"))
			.sort((a, b) => (b.count || 0) - (a.count || 0))
			.slice(0, 10);
		show(els["tele-errors-empty"], errors.length === 0);
		const max = errors[0]?.count || 0;
		for (const error of errors) list.append(listRow(error.path, error.count || 0, max));
	}

	async function load() {
		const days = Number(els["tele-period"]?.value) || 7;
		show(els["tele-loading"], true);
		message(els["tele-fatal"], "");
		try {
			const start = isoDaysAgo(days);
			const end = new Date().toISOString();
			const [total, hitsData] = await Promise.all([
				api(`/stats/total?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
				api(`/stats/hits?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=100&group=day`),
			]);
			const hits = Array.isArray(hitsData.hits) ? hitsData.hits : [];
			fillKpis(total, hits);
			renderChart(total);
			renderPages(hits);
			renderLikes(hits);
			renderErrors(hits);
			show(els["tele-stats"], true);
		} catch (error) {
			if (/401|403|token| unauthorized/i.test(String(error?.message))) {
				setToken("");
				show(els["tele-stats"], false);
				await showConnect(`Token rejected: ${error.message}. Paste a fresh one.`);
			} else {
				message(els["tele-fatal"], `Could not load stats: ${error?.message || error}`);
			}
		} finally {
			show(els["tele-loading"], false);
		}
	}

	async function showConnect(errorText) {
		show(els["tele-connect"], true);
		show(els["tele-stats"], false);
		message(els["tele-connect-error"], errorText || "");
		els["tele-token"]?.focus();
	}

	function init() {
		cache();

		els["tele-connect-form"]?.addEventListener("submit", (event) => {
			event.preventDefault();
			const value = els["tele-token"]?.value.trim();
			if (!value) {
				message(els["tele-connect-error"], "Paste the token first.");
				return;
			}
			setToken(value);
			if (els["tele-token"]) els["tele-token"].value = "";
			show(els["tele-connect"], false);
			load();
		});

		els["tele-disconnect"]?.addEventListener("click", () => {
			setToken("");
			showConnect("");
		});

		els["tele-period"]?.addEventListener("change", () => {
			if (getToken()) load();
		});

		/* Ctrl+Alt+T is the site-wide shortcut: here it goes back home. */
		document.addEventListener("keydown", (event) => {
			if (event.ctrlKey && event.altKey && (event.code === "KeyT" || event.key.toLowerCase() === "t")) {
				event.preventDefault();
				window.location.href = "../";
			}
		});

		if (getToken()) load();
		else showConnect("");
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
	else init();
})();

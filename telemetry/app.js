/* Telemetry dashboard: Supabase events + reactions, no token needed.
   Config must stay in sync with DX.supabase in js/core.js. */
(function () {
	"use strict";

	const CONFIG = { url: "https://vjeqkzvurtccdmrxtgcc.supabase.co", anonKey: "sb_publishable_JeHxCdO-5If3kUadHkXW6g_oKm2Hd0r" };

	const els = {};

	function cache() {
		for (const id of [
			"tele-stats",
			"tele-period",
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

	function dayKey(date) {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	}

	function rest(path) {
		return fetch(`${CONFIG.url}/rest/v1/${path}`, {
			headers: {
				apikey: CONFIG.anonKey,
				Authorization: `Bearer ${CONFIG.anonKey}`,
				"Content-Type": "application/json",
			},
		}).then(async (response) => {
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return Array.isArray(body) ? body : [];
		});
	}

	function daysRange(count) {
		const out = [];
		const now = new Date();
		for (let offset = count - 1; offset >= 0; offset -= 1) {
			const date = new Date();
			date.setDate(now.getDate() - offset);
			out.push(dayKey(date));
		}
		return out;
	}

	function groupCount(rows, keyFn) {
		const counts = new Map();
		for (const row of rows) {
			const key = keyFn(row);
			if (!key) continue;
			counts.set(key, (counts.get(key) || 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}

	function fillKpis(views, days) {
		const today = dayKey(new Date());
		const daily = new Map();
		for (const view of views) {
			const key = dayKey(new Date(view.created_at));
			daily.set(key, (daily.get(key) || 0) + 1);
		}
		els["kpi-visits"].textContent = String(views.length);
		els["kpi-today"].textContent = String(daily.get(today) || 0);
		els["kpi-peak"].textContent = String(days.reduce((max, day) => Math.max(max, daily.get(day) || 0), 0));
		return daily;
	}

	function renderChart(days, daily) {
		const chart = els["tele-chart"];
		chart.replaceChildren();
		if (!days.length) {
			show(els["tele-chart-empty"], true);
			return;
		}
		show(els["tele-chart-empty"], false);
		const peak = days.reduce((max, day) => Math.max(max, daily.get(day) || 0), 0) || 1;
		for (const day of days) {
			const value = daily.get(day) || 0;
			const bar = document.createElement("div");
			bar.className = `tele-chart__bar${value ? "" : " tele-chart__bar--empty"}`;
			bar.style.height = `${Math.max(4, Math.round((value / peak) * 100))}%`;
			bar.title = `${day}: ${value}`;
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

	function renderPages(views) {
		const list = els["tele-pages"];
		list.replaceChildren();
		const pages = groupCount(views, (view) => view.path).slice(0, 10);
		show(els["tele-pages-empty"], pages.length === 0);
		const max = pages[0]?.[1] || 0;
		for (const [path, count] of pages) list.append(listRow(path, count, max));
	}

	function renderLikes(totals) {
		const list = els["tele-likes"];
		list.replaceChildren();
		const rows = totals
			.filter((row) => row && typeof row.repo === "string")
			.sort((a, b) => (b.likes + b.dislikes) - (a.likes + a.dislikes));
		show(els["tele-likes-empty"], rows.length === 0);
		for (const stat of rows) {
			const extra = document.createElement("span");
			const up = document.createElement("span");
			up.className = `tele-like-stat tele-like-stat--up${stat.likes ? " is-active" : ""}`;
			up.textContent = `👍 ${stat.likes}`;
			const down = document.createElement("span");
			down.className = `tele-like-stat tele-like-stat--down${stat.dislikes ? " is-active" : ""}`;
			down.textContent = `👎 ${stat.dislikes}`;
			extra.append(up, down);
			list.append(listRow(stat.repo, null, 0, extra));
		}
		return rows.reduce((sum, row) => sum + row.likes + row.dislikes, 0);
	}

	function renderErrors(events) {
		const list = els["tele-errors"];
		list.replaceChildren();
		const errors = groupCount(
			events.filter((event) => event.name.startsWith("error/")),
			(event) => (event.title ? `${event.name} — ${event.title}` : event.name),
		).slice(0, 10);
		show(els["tele-errors-empty"], errors.length === 0);
		const max = errors[0]?.[1] || 0;
		for (const [name, count] of errors) list.append(listRow(name, count, max));
	}

	async function load() {
		const period = Number(els["tele-period"]?.value) || 7;
		show(els["tele-loading"], true);
		message(els["tele-fatal"], "");
		try {
			const start = isoDaysAgo(period);
			const [events, totals] = await Promise.all([
				rest(`events?select=name,path,title,created_at&created_at=gte.${encodeURIComponent(start)}&order=created_at.asc&limit=1000`),
				rest("reaction_totals?select=repo,likes,dislikes"),
			]);
			const views = events.filter((event) => event.name === "view");
			const days = daysRange(period);
			const daily = fillKpis(views, days);
			renderChart(days, daily);
			renderPages(views);
			const reactionTotal = renderLikes(totals);
			els["kpi-events"].textContent = String(reactionTotal);
			renderErrors(events);
			show(els["tele-stats"], true);
		} catch (error) {
			message(els["tele-fatal"], `Could not load stats: ${error?.message || error}`);
			show(els["tele-stats"], false);
		} finally {
			show(els["tele-loading"], false);
		}
	}

	function init() {
		cache();

		els["tele-period"]?.addEventListener("change", load);

		/* Ctrl+Alt+T is the site-wide shortcut: here it goes back home. */
		document.addEventListener("keydown", (event) => {
			if (event.ctrlKey && event.altKey && (event.code === "KeyT" || event.key.toLowerCase() === "t")) {
				event.preventDefault();
				window.location.href = "../";
			}
		});

		load();
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
	else init();
})();

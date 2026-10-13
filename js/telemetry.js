/* Telemetry: pageviews, error and reaction events stored in Supabase (DX.supabase).
   Fire-and-forget — a failed or missing backend can never break the site. */
(function () {
	"use strict";

	const DX = window.DX;
	const MAX_ERROR_EVENTS = 20;
	const MAX_QUEUE = 50;
	const FLUSH_DELAY = 800;

	const seenErrors = new Set();
	const pending = [];
	let flushTimer = 0;

	function config() {
		const db = DX.supabase;
		return db && db.url && db.anonKey ? db : null;
	}

	function flush() {
		if (!pending.length) return;
		const db = config();
		if (!db) {
			pending.length = 0;
			return;
		}
		const rows = pending.splice(0, pending.length);
		try {
			fetch(`${db.url}/rest/v1/events`, {
				method: "POST",
				headers: {
					apikey: db.anonKey,
					Authorization: `Bearer ${db.anonKey}`,
					"Content-Type": "application/json",
					Prefer: "return=minimal",
				},
				body: JSON.stringify(rows),
				keepalive: true,
			}).catch(() => {});
		} catch (error) {
			/* telemetry must never break the site */
		}
	}

	function scheduleFlush() {
		if (flushTimer) return;
		flushTimer = window.setTimeout(() => {
			flushTimer = 0;
			flush();
		}, FLUSH_DELAY);
	}

	function push(name, title) {
		if (!config()) return;
		pending.push({
			name: String(name).slice(0, 200),
			path: String(window.location.pathname || "/").slice(0, 300),
			title: title ? String(title).slice(0, 160) : "",
		});
		if (pending.length > MAX_QUEUE) pending.shift();
		scheduleFlush();
	}

	/* Fire-and-forget event: the name doubles as the event id in the dashboard. */
	function event(name, title) {
		push(name, title);
	}

	/* Error reporting, deduplicated so one bug cannot flood the table. */
	function report(name, message) {
		const text = String(message || "unknown error").slice(0, 160);
		const key = `${name}:${text}`;
		if (seenErrors.has(key)) return;
		if (seenErrors.size >= MAX_ERROR_EVENTS) return;
		seenErrors.add(key);
		event(name, text);
	}

	function countView() {
		push("view", document.title || "");
	}

	function onWindowError(event) {
		const target = event.target;
		const isResource = target && target !== window && (target.src || target.href);
		if (isResource) {
			const tag = (target.tagName || "resource").toLowerCase();
			report("error/resource", `${tag}: ${target.src || target.href}`);
			return;
		}
		report("error/js", event.error?.message || event.message || "error");
	}

	function onRejection(event) {
		const reason = event.reason;
		report("error/js", reason?.message || String(reason) || "unhandled rejection");
	}

	function init() {
		window.addEventListener("error", onWindowError, true);
		window.addEventListener("unhandledrejection", onRejection);

		/* Defer the first count so the router can normalize deep links first. */
		window.setTimeout(countView, 0);

		/* The router writes the workspace path on this event; count after it. */
		DX.events.on("workspace-changed", () => {
			window.setTimeout(countView, 0);
		});

		/* Send whatever is queued when the tab goes away. */
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") flush();
		});
		window.addEventListener("pagehide", flush);
	}

	DX.telemetry = { init, event, report };
})();

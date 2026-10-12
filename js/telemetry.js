/* Telemetry: GoatCounter pageviews, error events and reaction events.
   Requires the count.js script tag in index.html (replace MYCODE).
   The API is available at load time; init() wires listeners at boot. */
(function () {
	"use strict";

	const DX = window.DX;
	const MAX_ERROR_EVENTS = 20;
	const MAX_QUEUE = 50;

	const seenErrors = new Set();
	const pending = [];

	function flush() {
		while (pending.length) {
			const vars = pending.shift();
			try {
				window.goatcounter?.count?.(vars);
			} catch (error) {
				/* telemetry must never break the site */
			}
		}
	}

	function send(vars) {
		if (typeof window.goatcounter?.count === "function") {
			flush();
			try {
				window.goatcounter.count(vars);
			} catch (error) {
				/* ignore */
			}
			return;
		}
		pending.push(vars);
		if (pending.length > MAX_QUEUE) pending.shift();
	}

	/* Fire-and-forget event: path doubles as the event name in GoatCounter. */
	function event(name, title) {
		send({ event: true, path: String(name).slice(0, 200), title: title ? String(title).slice(0, 160) : "", no_session: true });
	}

	/* Error reporting, deduplicated so one bug cannot flood the counter. */
	function report(name, message) {
		const text = String(message || "unknown error").slice(0, 160);
		const key = `${name}:${text}`;
		if (seenErrors.has(key)) return;
		if (seenErrors.size >= MAX_ERROR_EVENTS) return;
		seenErrors.add(key);
		event(name, text);
	}

	function countView() {
		send({ path: window.location.pathname || "/" });
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

		/* Keep flushing while count.js loads (async, may lose the race). */
		let tries = 0;
		const timer = window.setInterval(() => {
			flush();
			tries += 1;
			if (!pending.length || tries > 40) window.clearInterval(timer);
		}, 500);
	}

	DX.telemetry = { init, event, report };
})();

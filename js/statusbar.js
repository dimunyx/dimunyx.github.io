/* Status bar: clock (HH:MM) + session info context menu. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	const refs = {};
	let timerId = 0;
	let lastTime = "";

	function updateClock() {
		const now = new Date();
		const hh = String(now.getHours()).padStart(2, "0");
		const mm = String(now.getMinutes()).padStart(2, "0");
		const time = `${hh}:${mm}`;
		if (time !== lastTime) {
			lastTime = time;
			if (refs.time) refs.time.textContent = time;
		}
	}

	function init() {
		refs.bar = element("status-bar");
		refs.time = element("status-time");
		refs.clock = element("status-clock");
		refs.menuVersion = element("clock-menu-version");
		if (!refs.bar) return;

		if (refs.bar.tagName === "FOOTER" && !refs.bar.hasAttribute("aria-label")) {
			refs.bar.setAttribute("aria-label", "Status bar");
		}

		updateClock();
		if (timerId) window.clearInterval(timerId);
		timerId = window.setInterval(updateClock, 15000);
		window.addEventListener("focus", updateClock);
	}

	DX.statusbar = {
		init,
		setVersion(label) {
			if (refs.menuVersion) refs.menuVersion.textContent = label;
		},
	};
})();

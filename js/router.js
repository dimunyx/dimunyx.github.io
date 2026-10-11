/* Router: mirrors the active workspace (and an optional dialog) in the URL path,
   e.g. /main/, /projects/, /design/terminal. Deep links are handed over by
   404.html as a location hash, because static hosting has no rewrites. */
(function () {
	"use strict";

	const DX = window.DX;

	/* Dialogs that can be opened straight from the URL. */
	const ACTIONS = {
		terminal: () => DX.terminal?.open(),
		settings: () => DX.settingsUI?.open(),
		help: () => DX.modals?.open("help-modal"),
	};

	let applyingFromHistory = false;

	function workspaceIds() {
		return DX.workspaces.list().map((workspace) => workspace.id);
	}

	function normalizePath(pathname) {
		let raw = String(pathname || "");
		if (raw.startsWith("#")) raw = raw.slice(1);
		try {
			raw = raw
				.split("/")
				.map((segment) => decodeURIComponent(segment).toLowerCase())
				.filter(Boolean)
				.join("/");
		} catch {
			/* malformed percent-encoding: keep the raw lowercased path */
			raw = raw
				.split("/")
				.map((segment) => segment.toLowerCase())
				.filter(Boolean)
				.join("/");
		}
		return raw ? raw.split("/") : [];
	}

	function resolveWorkspace(id) {
		/* The bare site root counts as the default workspace. */
		if (id === undefined) return "main";
		return workspaceIds().includes(id) ? id : null;
	}

	function buildPath(workspaceId) {
		return `/${workspaceId}/`;
	}

	function applyPath(pathname, options = {}) {
		const [workspaceId, action] = normalizePath(pathname);
		const target = resolveWorkspace(workspaceId);
		if (target && target !== DX.workspaces.activeId()) {
			DX.workspaces.switchTo(target, { animate: options.animate !== false });
		}
		if (options.openAction === false) return;
		const run = action ? ACTIONS[action] : null;
		if (!run) return;
		try {
			run();
		} catch (error) {
			console.warn("[dimunyx] deep-link action failed", error);
		}
	}

	function syncFromState() {
		if (applyingFromHistory) return;
		const path = buildPath(DX.workspaces.activeId());
		if (window.location.pathname === path) return;
		try {
			window.history.pushState(null, "", path);
		} catch (error) {
			/* history may be blocked (file://); the site works without it */
		}
	}

	function init() {
		/* A hash like #/design/terminal means the visitor came through 404.html. */
		let pending = null;
		if (window.location.hash.startsWith("#/")) {
			pending = window.location.hash.slice(1);
			try {
				window.history.replaceState(null, "", pending || "/");
			} catch (error) {
				/* keep the hash URL if replaceState is blocked */
			}
		}

		applyingFromHistory = true;
		applyPath(pending || window.location.pathname, { animate: false, openAction: true });
		applyingFromHistory = false;

		DX.events.on("workspace-changed", syncFromState);

		window.addEventListener("popstate", () => {
			applyingFromHistory = true;
			/* Back/forward moves between workspaces but does not reopen dialogs. */
			applyPath(window.location.pathname, { animate: true, openAction: false });
			applyingFromHistory = false;
		});
	}

	DX.router = { init, applyPath };
})();

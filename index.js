/* Boot: status-bar actions menu, version label, module init order. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	/* Shared popup wiring for the status-bar menus: open above the trigger,
	   close on outside pointerdown, Escape and toggle. */
	function createPopover(trigger, menu, options = {}) {
		let closeTimer = null;
		const align = options.align || "left";

		const finishClose = () => {
			closeTimer = null;
			menu.classList.remove("is-closing");
			menu.hidden = true;
		};

		const close = (restoreFocus = true) => {
			if (menu.hidden) return;
			window.clearTimeout(closeTimer);
			menu.classList.remove("is-closing");
			menu.hidden = true;
			trigger.setAttribute("aria-expanded", "false");
			trigger.classList.remove("is-open");
			if (restoreFocus) trigger.focus();
		};

		const open = () => {
			window.clearTimeout(closeTimer);
			menu.classList.remove("is-closing");
			menu.hidden = false;
			const rect = trigger.getBoundingClientRect();
			const width = menu.offsetWidth;
			const left = align === "right" ? rect.right - width : rect.left;
			menu.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
			menu.style.top = `${Math.max(8, rect.top - menu.offsetHeight - 8)}px`;
			trigger.setAttribute("aria-expanded", "true");
			trigger.classList.add("is-open");
		};

		const animateClose = (restoreFocus = true) => {
			if (menu.hidden) return;
			trigger.setAttribute("aria-expanded", "false");
			trigger.classList.remove("is-open");
			if (restoreFocus) trigger.focus();
			if (!DX.motion.allowed()) {
				finishClose();
				return;
			}
			window.clearTimeout(closeTimer);
			menu.classList.add("is-closing");
			closeTimer = window.setTimeout(finishClose, DX.motion.duration("menu"));
		};

		trigger.addEventListener("click", () => {
			if (menu.hidden) open();
			else animateClose();
		});

		document.addEventListener("pointerdown", (event) => {
			if (menu.hidden || menu.classList.contains("is-closing")) return;
			if (menu.contains(event.target) || trigger.contains(event.target)) return;
			animateClose(false);
		});

		DX.esc.push({
			id: options.id || menu.id,
			isActive: () => !menu.hidden,
			close: () => {
				animateClose();
				return true;
			},
		});

		return { open, close };
	}

	function wireActionsMenu() {
		const trigger = element("status-actions");
		const menu = element("actions-menu");
		if (!trigger || !menu) return;

		const popover = createPopover(trigger, menu, { id: "actions-menu" });
		const closeMenu = popover.close;

		element("actions-settings")?.addEventListener("click", () => {
			closeMenu(false);
			DX.settingsUI?.open();
		});

		element("actions-help")?.addEventListener("click", () => {
			closeMenu(false);
			DX.modals.open("help-modal", { returnFocus: trigger });
		});

		element("actions-reload")?.addEventListener("click", () => window.location.reload());

		element("actions-exit")?.addEventListener("click", () => {
			closeMenu(false);
			/* Browsers refuse to close tabs the user opened by hand; explain instead of
			   dumping the visitor on about:blank. */
			window.close();
			window.setTimeout(() => {
				if (!window.closed) DX.modals.open("exit-modal", { returnFocus: trigger });
			}, 150);
		});
	}

	function wireWebringMenu() {
		const trigger = element("status-webring");
		const menu = element("webring-menu");
		if (!trigger || !menu) return;
		createPopover(trigger, menu, { id: "webring-menu", align: "right" });
	}

	function wireHero() {
		element("hero-explore")?.addEventListener("click", () => {
			DX.workspaces.switchTo("projects");
		});

		element("hero-devlog")?.addEventListener("click", () => {
			DX.devlog.goTo();
		});
	}

	function loadVersion() {
		try {
			fetch("./VERSION", { cache: "no-cache" })
				.then((response) => {
					if (!response.ok) throw new Error("Could not load VERSION");
					return response.text();
				})
				.then((version) => {
					const label = `v${version.trim().replace(/^v/i, "")}`;
					document
						.querySelectorAll(".help-modal__version, .test-warning-modal__version, .settings-current-version, #clock-menu-version")
						.forEach((node) => {
							node.textContent = label;
						});
				})
				.catch((error) => console.error(error));
		} catch (error) {
			console.warn("[dimunyx] fetch unavailable, version label skipped", error);
		}
	}

	function safe(name, fn) {
		try {
			fn();
		} catch (error) {
			console.error(`[dimunyx] ${name} failed to start`, error);
			DX.telemetry?.report("error/boot", `${name}: ${error?.message || error}`);
		}
	}

	function wireTelemetryShortcut() {
		document.addEventListener("keydown", (event) => {
			if (event.defaultPrevented) return;
			if (!event.ctrlKey || !event.altKey) return;
			if (event.code !== "KeyT" && event.key.toLowerCase() !== "t") return;
			if (DX.util.isEditableTarget(event.target)) return;
			event.preventDefault();
			window.location.href = "/telemetry/";
		});
	}

	function boot() {
		safe("telemetry", () => DX.telemetry.init());
		safe("settings", () => DX.settings.apply());
		safe("layout", () => DX.layout.init());
		safe("workspaces", () => DX.workspaces.init());
		safe("workspace layout", () => DX.layout.applyWorkspace(DX.workspaces.activeId(), { persistCurrent: false, animate: false }));
		safe("menus", () => DX.initMenus());
		safe("modals", () => DX.initModals());
		safe("selects", () => DX.select.init());
		safe("settings UI", () => DX.initSettings());
		safe("projects", () => DX.projects.init());
		safe("devlog", () => DX.devlog.init());
		safe("terminal", () => DX.terminal.init());
		safe("status bar", () => DX.statusbar.init());
		safe("hero", wireHero);
		safe("actions menu", wireActionsMenu);
		safe("webring menu", wireWebringMenu);
		safe("telemetry shortcut", wireTelemetryShortcut);
		safe("router", () => DX.router.init());
		loadVersion();
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
	else boot();
})();

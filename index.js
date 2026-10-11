/* Boot: status-bar actions menu, version label, module init order. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	function wireActionsMenu() {
		const trigger = element("status-actions");
		const menu = element("actions-menu");
		if (!trigger || !menu) return;

		let closeTimer = null;

		const finishClose = () => {
			closeTimer = null;
			menu.classList.remove("is-closing");
			menu.hidden = true;
		};

		const closeMenu = (restoreFocus = true) => {
			if (menu.hidden) return;
			window.clearTimeout(closeTimer);
			menu.classList.remove("is-closing");
			menu.hidden = true;
			trigger.setAttribute("aria-expanded", "false");
			trigger.classList.remove("is-open");
			if (restoreFocus) trigger.focus();
		};

		const openMenu = () => {
			window.clearTimeout(closeTimer);
			menu.classList.remove("is-closing");
			const rect = trigger.getBoundingClientRect();
			menu.hidden = false;
			menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8))}px`;
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
			if (menu.hidden) openMenu();
			else animateClose();
		});

		document.addEventListener("pointerdown", (event) => {
			if (menu.hidden || menu.classList.contains("is-closing")) return;
			if (menu.contains(event.target) || trigger.contains(event.target)) return;
			animateClose(false);
		});

		DX.esc.push({
			id: "actions-menu",
			isActive: () => !menu.hidden,
			close: () => {
				animateClose();
				return true;
			},
		});

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
		}
	}

	function boot() {
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
		safe("router", () => DX.router.init());
		loadVersion();
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
	else boot();
})();

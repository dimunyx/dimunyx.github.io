/* Boot: status-bar actions menu, version label, module init order. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	/* Spark burst shared by the hero and the site-wide click effect. The host
	   decides the coordinate space: the hero is positioned, the global layer is
	   a fixed full-viewport box, so client coordinates work as-is there. */
	const SPARK_COUNT = 9;
	const SPARK_LIMIT = 72;

	function sparkBurst(host, x, y, count = SPARK_COUNT) {
		if (DX.motion.tier() !== "enabled") return;
		const live = host.querySelectorAll(".hero__spark");
		if (live.length + count > SPARK_LIMIT) {
			const drop = live.length + count - SPARK_LIMIT;
			for (let index = 0; index < drop && index < live.length; index += 1) live[index].remove();
		}
		for (let index = 0; index < count; index += 1) {
			const spark = document.createElement("span");
			const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
			const distance = 22 + Math.random() * 42;
			spark.className = "hero__spark";
			spark.setAttribute("aria-hidden", "true");
			spark.style.left = `${x}px`;
			spark.style.top = `${y}px`;
			spark.style.setProperty("--spark-dx", `${Math.cos(angle) * distance}px`);
			spark.style.setProperty("--spark-dy", `${Math.sin(angle) * distance}px`);
			spark.style.setProperty("--spark-size", `${3 + Math.random() * 4}px`);
			host.append(spark);
			spark.addEventListener("animationend", () => spark.remove(), { once: true });
			window.setTimeout(() => spark.remove(), 1000);
		}
	}

	/* Every click and tap on the page throws the same spark burst as the hero.
	   Decorative only: the layer ignores pointer input and sits above content. */
	function wireClickSparks() {
		const hero = element("site-hero");
		let layer = null;

		const ensureLayer = () => {
			if (layer?.isConnected) return layer;
			layer = document.createElement("div");
			layer.className = "click-sparks";
			layer.setAttribute("aria-hidden", "true");
			document.body.append(layer);
			return layer;
		};

		document.addEventListener(
			"pointerdown",
			(event) => {
				if (event.button !== 0) return;
				if (DX.motion.tier() !== "enabled") return;
				/* The hero runs its own burst relative to its own box. */
				if (hero && hero.contains(event.target)) return;
				sparkBurst(ensureLayer(), event.clientX, event.clientY);
			},
			{ passive: true }
		);
	}

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

		wireHeroGlow();
	}

	/* Hero glow orbs chase the pointer with spring physics, get shoved by
	   clicks and throw a small spark burst. Decorative only. */
	function wireHeroGlow() {
		const hero = element("site-hero");
		if (!hero) return;
		const glows = Array.from(hero.querySelectorAll(".hero__glow"));
		if (!glows.length) return;

		const RANGE = 56;
		const STIFFNESS = 0.12;
		const DAMPING = 0.78;
		const DEPTH = [1, 0.55, 0.72, 0.88];
		const orbs = glows.map((glow, index) => ({
			glow,
			depth: DEPTH[index % DEPTH.length],
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
		}));
		const pokeTimers = new WeakMap();
		let frame = 0;
		let pointer = null;

		const stop = () => {
			if (frame) {
				window.cancelAnimationFrame(frame);
				frame = 0;
			}
		};

		const clearGlow = () => {
			stop();
			pointer = null;
			hero.classList.remove("is-glow-active");
			orbs.forEach((orb) => {
				orb.x = orb.y = orb.vx = orb.vy = 0;
				orb.glow.style.removeProperty("--glow-x");
				orb.glow.style.removeProperty("--glow-y");
			});
		};

		const tick = () => {
			frame = 0;
			if (DX.motion.tier() !== "enabled") {
				clearGlow();
				return;
			}
			const rect = hero.getBoundingClientRect();
			const nx = pointer && rect.width ? (pointer.x - rect.left) / rect.width - 0.5 : 0;
			const ny = pointer && rect.height ? (pointer.y - rect.top) / rect.height - 0.5 : 0;
			let moving = false;
			orbs.forEach((orb) => {
				const targetX = pointer ? nx * RANGE * orb.depth : 0;
				const targetY = pointer ? ny * RANGE * orb.depth : 0;
				orb.vx = (orb.vx + (targetX - orb.x) * STIFFNESS) * DAMPING;
				orb.vy = (orb.vy + (targetY - orb.y) * STIFFNESS) * DAMPING;
				orb.x += orb.vx;
				orb.y += orb.vy;
				if (
					Math.abs(orb.x - targetX) > 0.15 ||
					Math.abs(orb.y - targetY) > 0.15 ||
					Math.abs(orb.vx) > 0.03 ||
					Math.abs(orb.vy) > 0.03
				) {
					moving = true;
				}
				orb.glow.style.setProperty("--glow-x", `${orb.x.toFixed(2)}px`);
				orb.glow.style.setProperty("--glow-y", `${orb.y.toFixed(2)}px`);
			});
			if (moving) frame = window.requestAnimationFrame(tick);
			else if (!pointer) clearGlow();
		};

		const start = () => {
			if (!frame && DX.motion.tier() === "enabled") frame = window.requestAnimationFrame(tick);
		};

		const poke = (glow) => {
			const pending = pokeTimers.get(glow);
			if (pending) window.clearTimeout(pending);
			glow.classList.remove("is-poked");
			void glow.offsetWidth;
			glow.classList.add("is-poked");
			pokeTimers.set(
				glow,
				window.setTimeout(() => {
					glow.classList.remove("is-poked");
					pokeTimers.delete(glow);
				}, 660)
			);
		};

		const burst = (x, y) => sparkBurst(hero, x, y);

		const shove = (clientX, clientY) => {
			if (DX.motion.tier() !== "enabled") return;
			orbs.forEach((orb) => {
				const box = orb.glow.getBoundingClientRect();
				const dx = box.left + box.width / 2 - clientX;
				const dy = box.top + box.height / 2 - clientY;
				const distance = Math.hypot(dx, dy) || 1;
				const power = 6.5 / (1 + distance / 280);
				orb.vx += (dx / distance) * power;
				orb.vy += (dy / distance) * power;
			});
			start();
		};

		hero.addEventListener("pointerenter", (event) => {
			if (event.pointerType === "touch") return;
			if (DX.motion.tier() !== "enabled") return;
			hero.classList.add("is-glow-active");
		});

		hero.addEventListener("pointermove", (event) => {
			if (event.pointerType === "touch") return;
			if (DX.motion.tier() !== "enabled") return;
			pointer = { x: event.clientX, y: event.clientY };
			hero.classList.add("is-glow-active");
			start();
		});

		hero.addEventListener("pointerleave", () => {
			pointer = null;
			hero.classList.remove("is-glow-active");
			start();
		});

		hero.addEventListener("pointerdown", (event) => {
			if (event.button !== 0) return;
			if (!DX.motion.allowed()) return;
			const rect = hero.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			let nearest = null;
			let nearestDistance = Infinity;
			orbs.forEach((orb) => {
				const box = orb.glow.getBoundingClientRect();
				const cx = box.left + box.width / 2 - rect.left;
				const cy = box.top + box.height / 2 - rect.top;
				const distance = (cx - x) ** 2 + (cy - y) ** 2;
				if (distance < nearestDistance) {
					nearestDistance = distance;
					nearest = orb.glow;
				}
			});
			if (nearest) poke(nearest);
			burst(x, y);
			shove(event.clientX, event.clientY);
		});

		DX.events.on("motion-changed", (tier) => {
			if (tier !== "enabled") clearGlow();
		});
		DX.events.on("workspace-changed", clearGlow);
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
		safe("click sparks", wireClickSparks);
		safe("actions menu", wireActionsMenu);
		safe("webring menu", wireWebringMenu);
		safe("telemetry shortcut", wireTelemetryShortcut);
		safe("router", () => DX.router.init());
		loadVersion();
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
	else boot();
})();

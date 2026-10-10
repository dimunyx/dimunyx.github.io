/* Core: settings, themes, motion, tiny event bus, modal manager, escape stack. */
(function () {
	"use strict";

	const DX = (window.DX = window.DX || {});

	const SETTINGS_KEY = "dimunyx-settings-v1";
	const SETTINGS_SCHEMA = 2;
	const LEGACY_KEYS = ["dimunyx-settings-v1", "dimunyx-layout-v1", "dimunyx-repo-stats-v1"];

	const THEME_ORDER = ["mocha", "macchiato", "frappe", "latte", "gruvbox", "ayu", "adwaita", "kanagawa", "eldritch", "tokyo-night", "nord", "rose-pine", "dracula"];
	const THEME_LABELS = {
		mocha: "Catppuccin Mocha",
		macchiato: "Catppuccin Macchiato",
		frappe: "Catppuccin Frappe",
		latte: "Catppuccin Latte",
		gruvbox: "Gruvbox",
		ayu: "Ayu",
		adwaita: "ADW",
		kanagawa: "Kanagawa",
		eldritch: "Eldritch",
		"tokyo-night": "Tokyo Night",
		nord: "Nord",
		"rose-pine": "Rosé Pine",
		dracula: "Dracula",
	};
	const THEME_ACCENTS = {
		mocha: { blue: "#89b4fa", purple: "#cba6f7", green: "#a6e3a1", peach: "#fab387", red: "#f38ba8", yellow: "#f9e2af", black: "#11111b", white: "#ffffff" },
		macchiato: { blue: "#8aadf4", purple: "#c6a0f6", green: "#a6da95", peach: "#f5a97f", red: "#ed8796", yellow: "#eed49f", black: "#181926", white: "#ffffff" },
		frappe: { blue: "#8caaee", purple: "#ca9ee6", green: "#a6d189", peach: "#ef9f76", red: "#e78284", yellow: "#e5c890", black: "#232634", white: "#ffffff" },
		latte: { blue: "#1e66f5", purple: "#8839ef", green: "#40a02b", peach: "#fe640b", red: "#d20f39", yellow: "#df8e1d", black: "#11111b", white: "#dc8a78" },
		gruvbox: { blue: "#83a598", purple: "#d3869b", green: "#b8bb26", peach: "#fe8019", red: "#fb4934", yellow: "#fabd2f", black: "#1d2021", white: "#ebdbb2" },
		ayu: { blue: "#59c2ff", purple: "#d2a6ff", green: "#bae67e", peach: "#ff9e64", red: "#ff6188", yellow: "#ffcc66", black: "#0f1419", white: "#e6e1cf" },
		adwaita: { blue: "#3584e4", purple: "#9141ac", green: "#33d17a", peach: "#ff7800", red: "#e01b24", yellow: "#f8e45c", black: "#242424", white: "#ffffff" },
		kanagawa: { blue: "#7e9cd8", purple: "#957fb8", green: "#98bb6c", peach: "#ffa066", red: "#e82424", yellow: "#e6c384", black: "#090618", white: "#dcd7ba" },
		eldritch: { blue: "#86aaeb", purple: "#c678dd", green: "#98c379", peach: "#ff9e64", red: "#f07178", yellow: "#ffc777", black: "#16161e", white: "#c1c4d6" },
		"tokyo-night": { blue: "#7aa2f7", purple: "#bb9af7", green: "#9ece6a", peach: "#ff9e64", red: "#f7768e", yellow: "#e0af68", black: "#15161e", white: "#c0caf5" },
		nord: { blue: "#81a1c1", purple: "#b48ead", green: "#a3be8c", peach: "#d08770", red: "#bf616a", yellow: "#ebcb8b", black: "#2e3440", white: "#eceff4" },
		"rose-pine": { blue: "#9ccfd8", purple: "#c4a7e7", green: "#31748f", peach: "#f6c177", red: "#eb6f92", yellow: "#f6c177", black: "#191724", white: "#e0def4" },
		dracula: { blue: "#8be9fd", purple: "#bd93f9", green: "#50fa7b", peach: "#ffb86c", red: "#ff5555", yellow: "#f1fa8c", black: "#21222c", white: "#f8f8f2" },
	};
	/* A few extra swatch colours shown in the Palette workspace preview. */
	const THEME_PREVIEW = {
		mocha: ["#1e1e2e", "#313244", "#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8"],
		macchiato: ["#24273a", "#363a4f", "#8aadf4", "#a6da95", "#eed49f", "#ed8796"],
		frappe: ["#303446", "#414559", "#8caaee", "#a6d189", "#e5c890", "#e78284"],
		latte: ["#eff1f5", "#ccd0da", "#1e66f5", "#40a02b", "#df8e1d", "#d20f39"],
		gruvbox: ["#282828", "#3c3836", "#83a598", "#b8bb26", "#fabd2f", "#fb4934"],
		ayu: ["#0f1419", "#1f2430", "#59c2ff", "#bae67e", "#ffcc66", "#ff6188"],
		adwaita: ["#242424", "#383838", "#3584e4", "#33d17a", "#f8e45c", "#e01b24"],
		kanagawa: ["#1f1f28", "#363646", "#7e9cd8", "#98bb6c", "#e6c384", "#e82424"],
		eldritch: ["#212337", "#2f3149", "#86aaeb", "#98c379", "#ffc777", "#f07178"],
		"tokyo-night": ["#1a1b26", "#292e42", "#7aa2f7", "#9ece6a", "#e0af68", "#f7768e"],
		nord: ["#2e3440", "#434c5e", "#88c0d0", "#a3be8c", "#ebcb8b", "#bf616a"],
		"rose-pine": ["#191724", "#26233a", "#c4a7e7", "#31748f", "#f6c177", "#eb6f92"],
		dracula: ["#282a36", "#44475a", "#bd93f9", "#50fa7b", "#f1fa8c", "#ff5555"],
	};
	const ACCENT_NAMES = ["blue", "purple", "green", "peach", "red", "yellow", "black", "white"];

	const DEFAULT_SETTINGS = Object.freeze({
		schema: SETTINGS_SCHEMA,
		theme: "mocha",
		accent: "blue",
		customAccent: "",
		compactMode: false,
		showSectionControls: true,
		animations: "enabled",
		defaultSectionMode: "tiled",
		windowEffects: true,
		startupWorkspace: "main",
	});

	const ANIMATION_MODES = new Set(["enabled", "reduced", "disabled"]);

	const isHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

	/* Nothing persists: wipe legacy storage so nothing stays on the visitor's PC. */
	function purgeStorage() {
		try {
			for (const key of LEGACY_KEYS) localStorage.removeItem(key);
			for (const key of LEGACY_KEYS) sessionStorage.removeItem(key);
		} catch (error) {
			/* storage may be blocked entirely; that is fine */
		}
	}
	purgeStorage();

	let settings = { ...DEFAULT_SETTINGS };

	function getSettings() {
		return settings;
	}

	function setSetting(key, value) {
		if (!(key in DEFAULT_SETTINGS)) return false;
		settings[key] = value;
		applySettings();
		return true;
	}

	function resetSettings() {
		settings = { ...DEFAULT_SETTINGS };
		applySettings();
	}

	function accentHex() {
		if (settings.accent === "custom" && isHex(settings.customAccent)) return settings.customAccent.toLowerCase();
		const accents = THEME_ACCENTS[settings.theme] || THEME_ACCENTS.mocha;
		return accents[settings.accent] || accents.blue;
	}

	function readableInk(hex) {
		const value = hex.replace("#", "");
		const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
		const linear = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
		const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
		return luminance > 0.45 ? "#11111b" : "#ffffff";
	}

	function applySettings() {
		const root = document.documentElement;
		root.dataset.theme = THEME_ORDER.includes(settings.theme) ? settings.theme : "mocha";
		root.dataset.anim = ANIMATION_MODES.has(settings.animations) ? settings.animations : "enabled";
		root.style.setProperty("--md-primary", accentHex());
		root.style.setProperty("--md-on-primary", readableInk(accentHex()));
		root.classList.toggle("is-compact", settings.compactMode);
		root.classList.toggle("hide-section-controls", !settings.showSectionControls);
		emit("settings-changed", settings);
	}

	/* ------------------------------------------------------------------ *
	 * Motion helpers
	 * ------------------------------------------------------------------ */

	function motionTier() {
		if (prefersReducedMotion.matches) return "disabled";
		if (settings.animations === "disabled") return "disabled";
		if (settings.animations === "reduced") return "reduced";
		return "enabled";
	}

	function motionAllowed() {
		return motionTier() !== "disabled";
	}

	function motionDuration(kind) {
		const tier = motionTier();
		if (tier === "disabled") return 0;
		if (tier === "reduced") return 160;
		if (kind === "modal") return 650;
		if (kind === "workspace") return 420;
		return 140;
	}

	function sectionEffectsEnabled() {
		return settings.windowEffects === true && motionAllowed();
	}

	prefersReducedMotion.addEventListener?.("change", () => emit("motion-changed", motionTier()));

	/* ------------------------------------------------------------------ *
	 * Event bus
	 * ------------------------------------------------------------------ */

	const listeners = new Map();

	function on(type, handler) {
		if (!listeners.has(type)) listeners.set(type, new Set());
		listeners.get(type).add(handler);
		return () => off(type, handler);
	}

	function off(type, handler) {
		listeners.get(type)?.delete(handler);
	}

	function emit(type, detail) {
		listeners.get(type)?.forEach((handler) => {
			try {
				handler(detail);
			} catch (error) {
				console.error(`[dimunyx] listener for "${type}" failed`, error);
			}
		});
	}

	/* ------------------------------------------------------------------ *
	 * Escape handling: one key, one layer at a time.
	 * ------------------------------------------------------------------ */

	const escapeLayers = [];

	function pushEscapeLayer(layer) {
		if (!escapeLayers.includes(layer)) escapeLayers.unshift(layer);
	}

	function removeEscapeLayer(layer) {
		const index = escapeLayers.indexOf(layer);
		if (index >= 0) escapeLayers.splice(index, 1);
	}

	document.addEventListener(
		"keydown",
		(event) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			for (const layer of [...escapeLayers]) {
				if (layer.isActive() && layer.close()) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
			}
		},
		true,
	);

	/* ------------------------------------------------------------------ *
	 * Modal manager
	 * ------------------------------------------------------------------ */

	const openModals = [];
	const modalReturnFocus = new Map();

	function modalElement(idOrElement) {
		return typeof idOrElement === "string" ? document.getElementById(idOrElement) : idOrElement;
	}

	function focusableWithin(container) {
		return [...container.querySelectorAll(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
		)].filter((element) => !element.hidden && element.offsetParent !== null);
	}

	function openModal(idOrElement, options = {}) {
		const modal = modalElement(idOrElement);
		if (!modal || !modal.classList.contains("telegram-modal")) return null;
		if (openModals.includes(modal)) {
			modal.focus();
			return modal;
		}
		modalReturnFocus.set(modal, options.returnFocus instanceof HTMLElement ? options.returnFocus : document.activeElement);
		modal.hidden = false;
		modal.setAttribute("aria-hidden", "false");
		openModals.push(modal);
		requestAnimationFrame(() => modal.classList.add("is-open"));
		syncModalScrollLock();
		const preferred = options.focusSelector ? modal.querySelector(options.focusSelector) : null;
		const target = preferred || modal.querySelector(".telegram-modal__close, .warning-modal__close") || modal.querySelector(".telegram-modal__dialog");
		target?.focus?.();
		return modal;
	}

	function closeModal(idOrElement, options = {}) {
		const modal = modalElement(idOrElement);
		if (!modal || modal.hidden) return;
		const index = openModals.indexOf(modal);
		if (index >= 0) openModals.splice(index, 1);
		modal.classList.remove("is-open");
		modal.setAttribute("aria-hidden", "true");
		syncModalScrollLock();
		const delay = motionDuration("modal");
		window.setTimeout(() => {
			if (openModals.includes(modal)) return;
			modal.hidden = true;
		}, delay);
		if (options.restoreFocus !== false) {
			const previous = modalReturnFocus.get(modal);
			if (previous instanceof HTMLElement && previous.isConnected && previous.offsetParent !== null) {
				previous.focus();
			}
		}
		modalReturnFocus.delete(modal);
	}

	function closeTopModal() {
		const top = openModals[openModals.length - 1];
		if (!top) return false;
		closeModal(top);
		return true;
	}

	function isModalOpen(idOrElement) {
		const modal = modalElement(idOrElement);
		return Boolean(modal && openModals.includes(modal));
	}

	function topModal() {
		return openModals[openModals.length - 1] || null;
	}

	function syncModalScrollLock() {
		document.documentElement.classList.toggle("is-modal-open", openModals.length > 0);
	}

	/* Click on the scrim closes the topmost dialog. */
	document.addEventListener("click", (event) => {
		const top = topModal();
		if (!top || event.target !== top) return;
		closeModal(top);
	});

	/* Keep Tab inside the topmost dialog. */
	document.addEventListener(
		"keydown",
		(event) => {
			if (event.key !== "Tab") return;
			const top = topModal();
			if (!top || top.hidden) return;
			const dialog = top.querySelector(".telegram-modal__dialog");
			if (!dialog || !dialog.contains(document.activeElement)) return;
			const focusable = focusableWithin(dialog);
			if (!focusable.length) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		},
		true,
	);

	pushEscapeLayer({
		id: "modals",
		isActive: () => openModals.length > 0,
		close: () => closeTopModal(),
	});

	/* ------------------------------------------------------------------ *
	 * Small helpers
	 * ------------------------------------------------------------------ */

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function isEditableTarget(target) {
		if (!(target instanceof Element)) return false;
		if (target.isContentEditable) return true;
		const tag = target.tagName;
		if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
		return Boolean(target.closest("[contenteditable='true']"));
	}

	function element(id) {
		return document.getElementById(id);
	}

	DX.SETTINGS_KEY = SETTINGS_KEY;
	DX.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
	DX.THEME_ORDER = THEME_ORDER;
	DX.THEME_LABELS = THEME_LABELS;
	DX.THEME_ACCENTS = THEME_ACCENTS;
	DX.THEME_PREVIEW = THEME_PREVIEW;
	DX.ACCENT_NAMES = ACCENT_NAMES;
	DX.isHexColor = isHex;

	DX.settings = {
		get: getSettings,
		set: setSetting,
		reset: resetSettings,
		apply: applySettings,
		accentHex,
		themeAccents: () => THEME_ACCENTS[settings.theme] || THEME_ACCENTS.mocha,
	};

	DX.motion = {
		tier: motionTier,
		allowed: motionAllowed,
		duration: motionDuration,
		sectionEffects: sectionEffectsEnabled,
	};

	DX.events = { on, off, emit };
	DX.esc = { push: pushEscapeLayer, remove: removeEscapeLayer };
	DX.modals = { open: openModal, close: closeModal, closeTop: closeTopModal, isOpen: isModalOpen, top: topModal };
	DX.util = { clamp, isEditableTarget, element };
})();

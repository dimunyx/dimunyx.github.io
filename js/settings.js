/* Settings modal + Palette wiring for the Design workspace. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	const refs = {};

	function cacheRefs() {
		refs.modal = element("settings-modal");
		refs.theme = element("settings-theme");
		refs.accent = element("settings-accent");
		refs.customAccent = element("settings-custom-accent");
		refs.customField = element("settings-custom-accent-field");
		refs.windowEffects = element("settings-window-effects");
		refs.compact = element("settings-compact");
		refs.controls = element("settings-controls");
		refs.defaultLayout = element("settings-default-layout");
		refs.resetAppearance = element("settings-reset-appearance");
		refs.resetAll = element("settings-reset-all");
		refs.tiledCount = element("settings-tiled-count");
		refs.floatingCount = element("settings-floating-count");
		refs.close = refs.modal?.querySelector(".telegram-modal__close") || null;
	}

	function paintAccentOptions() {
		const accents = DX.settings.themeAccents();
		for (const option of refs.accent.options) {
			if (option.value === "custom") continue;
			const hex = accents[option.value];
			if (!hex) continue;
			option.style.backgroundColor = hex;
			option.style.color = hex === "#ffffff" ? "#11111b" : "#11111b";
		}
	}

	function syncForm() {
		const settings = DX.settings.get();
		refs.theme.value = settings.theme;
		paintAccentOptions();
		refs.accent.value = settings.accent === "custom" ? "custom" : settings.accent;
		refs.customField.hidden = settings.accent !== "custom";
		refs.customAccent.value = settings.accent === "custom" ? settings.customAccent : "";
		refs.windowEffects.checked = settings.windowEffects;
		refs.compact.checked = settings.compactMode;
		refs.controls.checked = settings.showSectionControls;
		[refs.theme, refs.accent].forEach((select) => DX.select.refresh(select));
	}

	function updateCounts() {
		if (!refs.tiledCount || !refs.floatingCount) return;
		const { tiled, floating } = DX.layout.counts();
		refs.tiledCount.textContent = String(tiled);
		refs.floatingCount.textContent = String(floating);
	}

	function openSettings() {
		syncForm();
		updateCounts();
		DX.modals.open("settings-modal", { returnFocus: document.activeElement });
	}

	function bind() {
		refs.theme.addEventListener("change", () => {
			if (!DX.THEME_ORDER.includes(refs.theme.value)) return;
			DX.settings.set("theme", refs.theme.value);
			syncForm();
			renderPalette();
		});

		refs.accent.addEventListener("change", () => {
			if (refs.accent.value === "custom") {
				refs.customField.hidden = false;
				refs.customAccent.focus();
				return;
			}
			refs.customField.hidden = true;
			DX.settings.set("accent", refs.accent.value);
		});

		refs.customAccent.addEventListener("change", () => {
			const value = refs.customAccent.value.trim();
			if (!DX.isHexColor(value)) {
				refs.customAccent.setCustomValidity("Enter a HEX colour like #89b4fa.");
				refs.customAccent.reportValidity();
				refs.customAccent.value = DX.settings.get().customAccent;
				return;
			}
			refs.customAccent.setCustomValidity("");
			DX.settings.set("accent", "custom");
			DX.settings.set("customAccent", value.toLowerCase());
		});

		refs.windowEffects.addEventListener("change", () => DX.settings.set("windowEffects", refs.windowEffects.checked));
		refs.compact.addEventListener("change", () => DX.settings.set("compactMode", refs.compact.checked));
		refs.controls.addEventListener("change", () => DX.settings.set("showSectionControls", refs.controls.checked));

		refs.defaultLayout.addEventListener("click", () => {
			DX.layout.resetActiveLayout();
			updateCounts();
		});

		refs.resetAppearance.addEventListener("click", () => {
			DX.settings.set("theme", "mocha");
			DX.settings.set("accent", "blue");
			DX.settings.set("customAccent", "");
			syncForm();
			renderPalette();
		});

		refs.resetAll.addEventListener("click", () => {
			try {
				localStorage.removeItem(DX.layout.storageKey);
			} catch (error) {
				console.warn("[dimunyx] could not clear layout", error);
			}
			DX.settings.reset();
			window.location.reload();
		});

		DX.events.on("layout-changed", updateCounts);
	}

	/* ------------------------------------------------------------------ *
	 * Palette workspace section
	 * ------------------------------------------------------------------ */

	let paletteButtons = [];

	function renderPalette() {
		const list = element("palette-list");
		if (!list) return;
		const current = DX.settings.get().theme;
		list.replaceChildren();
		paletteButtons = [];
		for (const id of DX.THEME_ORDER) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "palette-btn";
			button.setAttribute("aria-pressed", String(id === current));
			button.dataset.themeId = id;

			const swatches = document.createElement("span");
			swatches.className = "palette-btn__swatches";
			swatches.setAttribute("aria-hidden", "true");
			for (const colour of DX.THEME_PREVIEW[id]) {
				const chip = document.createElement("i");
				chip.style.background = colour;
				swatches.append(chip);
			}

			const label = document.createElement("span");
			label.textContent = DX.THEME_LABELS[id];

			button.append(swatches, label);
			button.addEventListener("click", () => {
				DX.settings.set("theme", id);
				syncForm();
				renderPalette();
			});
			list.append(button);
			paletteButtons.push(button);
		}
	}

	function init() {
		cacheRefs();
		bind();
		renderPalette();
		DX.settingsUI = { open: openSettings };
	}

	DX.settingsUI = { open: () => element("settings-modal") && DX.modals.open("settings-modal") };
	DX.initSettings = init;
})();

/* Context menus: desktop, section layout, page info + the Inspect dialog. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	const refs = {};
	let contextSection = null;
	let inspectedHref = window.location.href;
	let actionTrigger = null;
	let returnFocus = null;
	const closeTimers = new WeakMap();

	function cacheRefs() {
		refs.desktop = element("desktop-context-menu");
		refs.sectionMode = element("section-mode-menu");
		refs.body = element("body-context-menu");
		refs.clockMenu = element("clock-menu");
		refs.clockMenuDate = element("clock-menu-date");
		refs.openTarget = element("open-context-target");
		refs.inspectTarget = element("inspect-context-target");
		refs.floatButton = element("float-section");
		refs.tileButton = element("tile-section");
		refs.siteInfo = element("site-info-menu-item");
		refs.layoutValue = element("current-layout-value");
		refs.ownerLink = element("body-owner-link");
		refs.inspectModal = element("inspect-modal");
		refs.inspectLink = element("inspect-modal-link");
		refs.inspectLinkRow = element("inspect-modal-link-row");
		refs.inspectNoLink = element("inspect-modal-no-link");
		refs.inspectCopy = element("inspect-modal-copy");
		refs.inspectCopyLabel = refs.inspectCopy?.querySelector("span") || null;
	}

	function hide(menu) {
		if (!menu || menu.hidden) return;
		if (!DX.motion.allowed()) {
			menu.hidden = true;
			menu.classList.remove("is-closing");
			closeTimers.delete(menu);
			return;
		}
		window.clearTimeout(closeTimers.get(menu));
		menu.classList.add("is-closing");
		closeTimers.set(
			menu,
			window.setTimeout(() => {
				menu.hidden = true;
				menu.classList.remove("is-closing");
				closeTimers.delete(menu);
			}, DX.motion.duration("menu")),
		);
	}

	function position(menu, event) {
		if (!menu) return;
		window.clearTimeout(closeTimers.get(menu));
		closeTimers.delete(menu);
		menu.classList.remove("is-closing");
		menu.hidden = false;
		const rect = menu.getBoundingClientRect();
		const left = Math.min(event.clientX, window.innerWidth - rect.width - 8);
		const top = Math.min(event.clientY, window.innerHeight - rect.height - 8);
		menu.style.left = `${Math.max(8, left)}px`;
		menu.style.top = `${Math.max(8, top)}px`;
	}

	function anyOpen() {
		return [refs.desktop, refs.sectionMode, refs.body, refs.clockMenu].some((menu) => menu && (!menu.hidden || menu.classList.contains("is-closing")));
	}

	function closeAll() {
		hide(refs.desktop);
		hide(refs.sectionMode);
		hide(refs.body);
		hide(refs.clockMenu);
		contextSection = null;
		actionTrigger = null;
	}

	function closeDesktop() {
		hide(refs.desktop);
		actionTrigger = null;
	}

	function closeSectionMode() {
		hide(refs.sectionMode);
		contextSection = null;
	}

	function closeBody() {
		hide(refs.body);
	}

	function updateLayoutLabel() {
		if (refs.layoutValue) refs.layoutValue.textContent = DX.layout.layoutLabel();
	}

	function openInspect() {
		const hasLink = Boolean(inspectedHref);
		refs.inspectLinkRow.hidden = !hasLink;
		refs.inspectNoLink.hidden = hasLink;
		if (hasLink) {
			refs.inspectLink.href = inspectedHref;
			refs.inspectLink.textContent = inspectedHref;
		}
		DX.modals.open("inspect-modal", { returnFocus });
	}

	function wireInspectCopy() {
		let copyTimer = 0;
		refs.inspectCopy.addEventListener("click", async () => {
			if (!inspectedHref) return;
			let label = "Failed";
			try {
				await navigator.clipboard.writeText(inspectedHref);
				label = "Copied";
			} catch (error) {
				label = "Failed";
			}
			refs.inspectCopyLabel.textContent = label;
			window.clearTimeout(copyTimer);
			copyTimer = window.setTimeout(() => {
				refs.inspectCopyLabel.textContent = "Copy";
			}, 1400);
		});
	}

	function handleContextMenu(event) {
		if (!(event.target instanceof Element)) {
			event.preventDefault();
			return;
		}
		if (event.target.closest(".desktop-context-menu")) {
			event.preventDefault();
			return;
		}

		closeAll();

		const dragHandle = event.target.closest(".section-drag-handle");
		if (dragHandle) {
			event.preventDefault();
			const section = dragHandle.closest("[data-section]");
			if (!section) return;
			contextSection = section;
			position(refs.sectionMode, event);
			return;
		}

		const revealTrigger = event.target.closest(".about-trigger, .telegram-trigger");
		if (revealTrigger) {
			event.preventDefault();
			actionTrigger = revealTrigger;
			inspectedHref = null;
			returnFocus = document.activeElement;
			refs.openTarget.hidden = false;
			position(refs.desktop, event);
			return;
		}

		const siteButton = event.target.closest("#status-terminal");
		if (siteButton) {
			event.preventDefault();
			actionTrigger = siteButton;
			inspectedHref = null;
			returnFocus = document.activeElement;
			refs.openTarget.hidden = false;
			position(refs.desktop, event);
			return;
		}

		const clockButton = event.target.closest("#status-clock");
		if (clockButton) {
			event.preventDefault();
			if (refs.clockMenuDate) {
				refs.clockMenuDate.textContent = new Date().toLocaleDateString([], {
					weekday: "long",
					day: "numeric",
					month: "long",
					year: "numeric",
				});
			}
			position(refs.clockMenu, event);
			return;
		}

		const editable = event.target.closest("input, textarea, select, [contenteditable='true']");
		if (editable) return;

		const clickedLink = event.target.closest("a[href]");
		if (event.target.closest(".layout-right")) {
			event.preventDefault();
			return;
		}

		if (!clickedLink) {
			if (event.target.closest("button, [role='button']")) {
				event.preventDefault();
				return;
			}
			event.preventDefault();
			if (event.target === document.body || event.target.closest(".page-container")) {
				updateLayoutLabel();
				returnFocus = document.activeElement;
				position(refs.body, event);
			}
			return;
		}

		event.preventDefault();
		returnFocus = document.activeElement;
		inspectedHref = clickedLink.href;
		const canOpen = Boolean(clickedLink.closest(".social-links, .webring, .project-card__actions"));
		actionTrigger = canOpen ? clickedLink : null;
		refs.openTarget.hidden = !canOpen;
		position(refs.desktop, event);
	}

	function init() {
		cacheRefs();
		if (!refs.desktop) return;

		document.addEventListener("contextmenu", handleContextMenu);

		document.addEventListener("pointerdown", (event) => {
			if (!refs.desktop.hidden && !refs.desktop.contains(event.target)) closeDesktop();
			if (!refs.sectionMode.hidden && !refs.sectionMode.contains(event.target)) closeSectionMode();
			if (!refs.body.hidden && !refs.body.contains(event.target)) closeBody();
			if (refs.clockMenu && !refs.clockMenu.hidden && !refs.clockMenu.contains(event.target)) hide(refs.clockMenu);
		});

		/* Clicking any menu item dismisses the menu it belongs to. */
		for (const menu of [refs.desktop, refs.sectionMode, refs.body, refs.clockMenu]) {
			if (!menu) continue;
			menu.addEventListener("click", () => {
				closeAll();
			});
		}

		refs.inspectTarget.addEventListener("click", () => {
			closeDesktop();
			openInspect();
		});

		refs.openTarget.addEventListener("click", () => {
			const trigger = actionTrigger;
			closeDesktop();
			trigger?.click();
		});

		refs.floatButton.addEventListener("click", () => {
			if (contextSection) DX.layout.toggleFloating(contextSection, true);
			closeSectionMode();
		});

		refs.tileButton.addEventListener("click", () => {
			if (contextSection) DX.layout.toggleFloating(contextSection, false);
			closeSectionMode();
		});

		refs.ownerLink.addEventListener("click", closeBody);
		refs.siteInfo.addEventListener("click", closeBody);

		wireInspectCopy();

		DX.esc.push({
			id: "context-menus",
			isActive: anyOpen,
			close: () => {
				closeAll();
				return true;
			},
		});
	}

	DX.initMenus = init;
})();

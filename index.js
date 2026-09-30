let draggedSection;
let currentDropTarget = null;
let currentDropKind = null;
let currentDropPosition = null;
let dragFrame = 0;
let dragPointerX = 0;
let dragPointerY = 0;
const floatingPlaceholders = new WeakMap();
const floatingResizeHandles = new WeakMap();
let contextMenuSection = null;
let floatingSection = null;
let floatingPointerId = null;
let floatingPointerOffsetX = 0;
let floatingPointerOffsetY = 0;
let resizingSection = null;
let resizePointerId = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
const resetButton = document.getElementById("reset-site");
const exitButton = document.getElementById("exit-site");
const helpButton = document.getElementById("help-site");
const helpModal = document.getElementById("help-modal");
const helpClose = helpModal.querySelector(".telegram-modal__close");
const testWarningModal = document.getElementById("test-warning-modal");
const testWarningClose = testWarningModal.querySelector(".warning-modal__close");
fetch("./VERSION", { cache: "no-cache" })
	.then((response) => {
		if (!response.ok) throw new Error("Could not load VERSION");
		return response.text();
	})
	.then((version) => {
		const label = `v${version.trim().replace(/^v/i, "")}`;
		document.querySelectorAll(".help-modal__version, .test-warning-modal__version").forEach((element) => {
			element.textContent = label;
		});
	})
	.catch((error) => console.error(error));
let helpCloseTimer;
let testWarningCloseTimer;
const resetIcon = resetButton.querySelector("img");
const resetFallback = resetButton.querySelector(".reset-site__fallback");
resetIcon.addEventListener("error", () => {
	resetIcon.hidden = true;
	resetFallback.hidden = false;
});
if (resetIcon.complete && resetIcon.naturalWidth === 0) {
	resetIcon.hidden = true;
	resetFallback.hidden = false;
}
resetButton.addEventListener("click", () => window.location.reload());
exitButton.addEventListener("click", () => {
	window.close();
	if (!window.closed) window.location.replace("about:blank");
});

function openHelpModal() {
	clearTimeout(helpCloseTimer);
	helpModal.hidden = false;
	helpModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => helpModal.classList.add("is-open"));
	helpClose.focus();
}

function closeHelpModal() {
	helpModal.classList.remove("is-open");
	helpModal.setAttribute("aria-hidden", "true");
	helpCloseTimer = setTimeout(() => {
		helpModal.hidden = true;
		helpButton.focus();
	}, 650);
}

helpButton.addEventListener("click", openHelpModal);
helpClose.addEventListener("click", closeHelpModal);

const desktopContextMenu = document.getElementById("desktop-context-menu");
const inspectMenuItem = document.getElementById("inspect-context-target");
const openContextTarget = document.getElementById("open-context-target");
const sectionModeMenu = document.getElementById("section-mode-menu");
const floatSectionButton = document.getElementById("float-section");
const tileSectionButton = document.getElementById("tile-section");
const bodyContextMenu = document.getElementById("body-context-menu");
const siteInfoMenuItem = document.getElementById("site-info-menu-item");
const currentLayoutValue = document.getElementById("current-layout-value");
const bodyOwnerLink = document.getElementById("body-owner-link");
const inspectModal = document.getElementById("inspect-modal");
const inspectClose = inspectModal.querySelector(".telegram-modal__close");
const inspectModalLink = document.getElementById("inspect-modal-link");
const inspectModalLinkRow = document.getElementById("inspect-modal-link-row");
const inspectModalNoLink = document.getElementById("inspect-modal-no-link");
const inspectCopyButton = document.getElementById("inspect-modal-copy");
const inspectCopyLabel = inspectCopyButton.querySelector("span");
const siteInfoModal = document.getElementById("site-info-modal");
const siteInfoClose = siteInfoModal.querySelector(".telegram-modal__close");
let inspectCloseTimer;
let inspectCopyTimer;
let siteInfoCloseTimer;
let inspectedHref = window.location.href;
let contextMenuReturnFocus = null;
let contextMenuActionTrigger = null;
const contextMenuCloseTimers = new WeakMap();

function closeDesktopContextMenu() {
	hideContextMenu(desktopContextMenu);
}

function openDesktopContextMenuAt(event, useLargeRadius = false) {
	desktopContextMenu.classList.toggle("desktop-context-menu--large-radius", useLargeRadius);
	positionContextMenuAt(desktopContextMenu, event);
}

function positionContextMenuAt(menu, event) {
	clearTimeout(contextMenuCloseTimers.get(menu));
	contextMenuCloseTimers.delete(menu);
	menu.classList.remove("is-closing");
	menu.hidden = false;
	const left = Math.min(event.clientX, window.innerWidth - menu.offsetWidth - 8);
	const top = Math.min(event.clientY, window.innerHeight - menu.offsetHeight - 8);
	menu.style.left = `${Math.max(8, left)}px`;
	menu.style.top = `${Math.max(8, top)}px`;
}

function closeSectionModeMenu() {
	hideContextMenu(sectionModeMenu);
	contextMenuSection = null;
}

function closeBodyContextMenu() {
	hideContextMenu(bodyContextMenu);
}

function hideContextMenu(menu) {
	if (menu.hidden) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		menu.hidden = true;
		menu.classList.remove("is-closing");
		return;
	}
	clearTimeout(contextMenuCloseTimers.get(menu));
	menu.classList.add("is-closing");
	contextMenuCloseTimers.set(menu, setTimeout(() => {
		menu.hidden = true;
		menu.classList.remove("is-closing");
		contextMenuCloseTimers.delete(menu);
	}, 140));
}

document.addEventListener("contextmenu", (event) => {
	if (!(event.target instanceof Element)) {
		event.preventDefault();
		return;
	}
	if (desktopContextMenu.contains(event.target) || sectionModeMenu.contains(event.target) || bodyContextMenu.contains(event.target)) {
		event.preventDefault();
		return;
	}
	closeDesktopContextMenu();
	closeSectionModeMenu();
	closeBodyContextMenu();
	contextMenuActionTrigger = null;
	openContextTarget.hidden = true;
	const dragHandle = event.target.closest(".section-drag-handle");
	if (dragHandle) {
		event.preventDefault();
		contextMenuSection = dragHandle.closest("section");
		positionContextMenuAt(sectionModeMenu, event);
		return;
	}
	const revealTrigger = event.target.closest(".about-trigger, .telegram-trigger");
	if (revealTrigger) {
		event.preventDefault();
		contextMenuActionTrigger = revealTrigger;
		inspectedHref = null;
		openContextTarget.hidden = false;
		openDesktopContextMenuAt(event, true);
		return;
	}
	const siteActionButton = event.target.closest("#help-site, #reset-site, #exit-site");
	if (siteActionButton) {
		event.preventDefault();
		contextMenuActionTrigger = siteActionButton;
		inspectedHref = null;
		openContextTarget.hidden = false;
		openDesktopContextMenuAt(event, true);
		return;
	}
	const clickedLink = event.target.closest("a[href]");
	if (event.target.closest(".layout-right > section")) {
		event.preventDefault();
		return;
	}
	if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
	if (!clickedLink) {
		if (event.target.closest("button, [role='button']")) {
			event.preventDefault();
			return;
		}
		event.preventDefault();
		if (event.target === document.body) openBodyContextMenuAt(event);
		return;
	}
	event.preventDefault();
	contextMenuReturnFocus = document.activeElement;
	inspectedHref = clickedLink.href;
	const canOpenFromMenu = clickedLink.closest(".social-links, .repository-links, .webring");
	contextMenuActionTrigger = canOpenFromMenu ? clickedLink : null;
	openContextTarget.hidden = !canOpenFromMenu;
	openDesktopContextMenuAt(event, Boolean(canOpenFromMenu));
});

document.addEventListener("pointerdown", (event) => {
	if (!desktopContextMenu.hidden && !desktopContextMenu.contains(event.target)) {
		contextMenuActionTrigger = null;
		closeDesktopContextMenu();
	}
	if (!sectionModeMenu.hidden && !sectionModeMenu.contains(event.target)) {
		closeSectionModeMenu();
	}
	if (!bodyContextMenu.hidden && !bodyContextMenu.contains(event.target)) {
		closeBodyContextMenu();
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
		closeDesktopContextMenu();
		closeSectionModeMenu();
		closeBodyContextMenu();
	}
});

function updateCurrentLayoutLabel() {
	const floatingCount = document.querySelectorAll("section.is-floating").length;
	currentLayoutValue.textContent = floatingCount === 0
		? "Tiling"
		: `Tiling + ${floatingCount} floating`;
}

function openBodyContextMenuAt(event) {
	updateCurrentLayoutLabel();
	positionContextMenuAt(bodyContextMenu, event);
}

floatSectionButton.addEventListener("click", () => {
	if (contextMenuSection) makeSectionFloating(contextMenuSection);
	closeSectionModeMenu();
});

tileSectionButton.addEventListener("click", () => {
	if (contextMenuSection) makeSectionTiled(contextMenuSection);
	closeSectionModeMenu();
});

function openInspectModal() {
	clearTimeout(inspectCloseTimer);
	const hasLink = Boolean(inspectedHref);
	inspectModalLinkRow.hidden = !hasLink;
	inspectModalNoLink.hidden = hasLink;
	if (hasLink) {
		inspectModalLink.href = inspectedHref;
		inspectModalLink.textContent = inspectedHref;
	}
	inspectModal.hidden = false;
	inspectModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => inspectModal.classList.add("is-open"));
	inspectClose.focus();
}

function closeInspectModal() {
	inspectModal.classList.remove("is-open");
	inspectModal.setAttribute("aria-hidden", "true");
	inspectCloseTimer = setTimeout(() => {
		inspectModal.hidden = true;
		if (contextMenuReturnFocus instanceof HTMLElement && contextMenuReturnFocus.isConnected) {
			contextMenuReturnFocus.focus();
		}
	}, 650);
}

inspectMenuItem.addEventListener("click", () => {
	contextMenuActionTrigger = null;
	closeDesktopContextMenu();
	openInspectModal();
});

openContextTarget.addEventListener("click", () => {
	const actionTrigger = contextMenuActionTrigger;
	contextMenuActionTrigger = null;
	closeDesktopContextMenu();
	if (actionTrigger) actionTrigger.click();
});

inspectCopyButton.addEventListener("click", async () => {
	if (!inspectedHref) return;
	try {
		await navigator.clipboard.writeText(inspectedHref);
		inspectCopyLabel.textContent = "Copied";
		clearTimeout(inspectCopyTimer);
		inspectCopyTimer = setTimeout(() => {
			inspectCopyLabel.textContent = "Copy";
		}, 1400);
	} catch {
		inspectCopyLabel.textContent = "Failed";
		clearTimeout(inspectCopyTimer);
		inspectCopyTimer = setTimeout(() => {
			inspectCopyLabel.textContent = "Copy";
		}, 1400);
	}
});

inspectClose.addEventListener("click", closeInspectModal);

function openSiteInfoModal() {
	clearTimeout(siteInfoCloseTimer);
	siteInfoModal.hidden = false;
	siteInfoModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => siteInfoModal.classList.add("is-open"));
	siteInfoClose.focus();
}

function closeSiteInfoModal() {
	siteInfoModal.classList.remove("is-open");
	siteInfoModal.setAttribute("aria-hidden", "true");
	siteInfoCloseTimer = setTimeout(() => {
		siteInfoModal.hidden = true;
	}, 650);
}

siteInfoMenuItem.addEventListener("click", () => {
	closeBodyContextMenu();
	openSiteInfoModal();
});
siteInfoClose.addEventListener("click", closeSiteInfoModal);
bodyOwnerLink.addEventListener("click", closeBodyContextMenu);

const telegramTrigger = document.querySelector(".telegram-trigger");
const telegramModal = document.getElementById("telegram-modal");
const telegramClose = telegramModal.querySelector(".telegram-modal__close");
const aboutTrigger = document.querySelector(".about-trigger");
const aboutModal = document.getElementById("about-modal");
const aboutClose = aboutModal.querySelector(".telegram-modal__close");
const interestsTrigger = document.querySelector(".interests-trigger");
const interestsModal = document.getElementById("interests-modal");
const interestsClose = interestsModal.querySelector(".telegram-modal__close");
const experienceTrigger = document.querySelector(".experience-trigger");
const experienceModal = document.getElementById("experience-modal");
const experienceClose = experienceModal.querySelector(".telegram-modal__close");
const socialTrigger = document.querySelector(".social-trigger");
const socialModal = document.getElementById("social-modal");
const socialClose = socialModal.querySelector(".telegram-modal__close");
const reposTrigger = document.querySelector(".repos-trigger");
const reposModal = document.getElementById("repos-modal");
const reposClose = reposModal.querySelector(".telegram-modal__close");
const usingNowTrigger = document.querySelector(".using-now-trigger");
const usingNowModal = document.getElementById("using-now-modal");
const usingNowClose = usingNowModal.querySelector(".telegram-modal__close");
let telegramCloseTimer;
let telegramReturnFocus;
let aboutCloseTimer;
let interestsCloseTimer;
let experienceCloseTimer;
let socialCloseTimer;
let reposCloseTimer;
let usingNowCloseTimer;

const modalScrollObserver = new MutationObserver(() => {
	const hasOpenModal = [...document.querySelectorAll(".telegram-modal")]
		.some((modal) => !modal.hidden);
	document.documentElement.classList.toggle("is-modal-open", hasOpenModal);
});
modalScrollObserver.observe(document.body, {
	attributes: true,
	attributeFilter: ["hidden"],
	subtree: true,
});

function openTestWarningModal() {
	clearTimeout(testWarningCloseTimer);
	testWarningModal.hidden = false;
	testWarningModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => testWarningModal.classList.add("is-open"));
}

function closeTestWarningModal() {
	testWarningModal.classList.remove("is-open");
	testWarningModal.setAttribute("aria-hidden", "true");
	testWarningCloseTimer = setTimeout(() => {
		testWarningModal.hidden = true;
	}, 650);
}

testWarningClose.addEventListener("click", closeTestWarningModal);
openTestWarningModal();

function openTelegramModal() {
	clearTimeout(telegramCloseTimer);
	telegramReturnFocus = socialModal && !socialModal.hidden ? socialTrigger : telegramTrigger;
	if (socialModal && !socialModal.hidden) {
		clearTimeout(socialCloseTimer);
		socialModal.classList.remove("is-open");
		socialModal.setAttribute("aria-hidden", "true");
		socialModal.hidden = true;
	}
	telegramModal.hidden = false;
	telegramModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => telegramModal.classList.add("is-open"));
	telegramClose.focus();
}

function closeTelegramModal() {
	telegramModal.classList.remove("is-open");
	telegramModal.setAttribute("aria-hidden", "true");
	telegramCloseTimer = setTimeout(() => {
		telegramModal.hidden = true;
		telegramReturnFocus.focus();
	}, 650);
}

telegramTrigger.addEventListener("click", openTelegramModal);
telegramClose.addEventListener("click", closeTelegramModal);

function openAboutModal() {
	clearTimeout(aboutCloseTimer);
	aboutModal.hidden = false;
	aboutModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => aboutModal.classList.add("is-open"));
	aboutClose.focus();
}

function closeAboutModal() {
	aboutModal.classList.remove("is-open");
	aboutModal.setAttribute("aria-hidden", "true");
	aboutCloseTimer = setTimeout(() => {
		aboutModal.hidden = true;
		aboutTrigger.focus();
	}, 650);
}

aboutTrigger.addEventListener("click", openAboutModal);
aboutClose.addEventListener("click", closeAboutModal);

function openInterestsModal() {
	clearTimeout(interestsCloseTimer);
	interestsModal.hidden = false;
	interestsModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => interestsModal.classList.add("is-open"));
	interestsClose.focus();
}

function closeInterestsModal() {
	interestsModal.classList.remove("is-open");
	interestsModal.setAttribute("aria-hidden", "true");
	interestsCloseTimer = setTimeout(() => {
		interestsModal.hidden = true;
		interestsTrigger.focus();
	}, 650);
}

interestsTrigger.addEventListener("click", openInterestsModal);
interestsClose.addEventListener("click", closeInterestsModal);

function openExperienceModal() {
	clearTimeout(experienceCloseTimer);
	experienceModal.hidden = false;
	experienceModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => experienceModal.classList.add("is-open"));
	experienceClose.focus();
}

function closeExperienceModal() {
	experienceModal.classList.remove("is-open");
	experienceModal.setAttribute("aria-hidden", "true");
	experienceCloseTimer = setTimeout(() => {
		experienceModal.hidden = true;
		experienceTrigger.focus();
	}, 650);
}

experienceTrigger.addEventListener("click", openExperienceModal);
experienceClose.addEventListener("click", closeExperienceModal);

function openSocialModal() {
	clearTimeout(socialCloseTimer);
	socialModal.hidden = false;
	socialModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => socialModal.classList.add("is-open"));
	socialClose.focus();
}

function closeSocialModal() {
	socialModal.classList.remove("is-open");
	socialModal.setAttribute("aria-hidden", "true");
	socialCloseTimer = setTimeout(() => {
		socialModal.hidden = true;
		socialTrigger.focus();
	}, 650);
}

socialTrigger.addEventListener("click", openSocialModal);
socialClose.addEventListener("click", closeSocialModal);

function openReposModal() {
	clearTimeout(reposCloseTimer);
	reposModal.hidden = false;
	reposModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => reposModal.classList.add("is-open"));
	reposClose.focus();
}

function closeReposModal() {
	reposModal.classList.remove("is-open");
	reposModal.setAttribute("aria-hidden", "true");
	reposCloseTimer = setTimeout(() => {
		reposModal.hidden = true;
		reposTrigger.focus();
	}, 650);
}

reposTrigger.addEventListener("click", openReposModal);
reposClose.addEventListener("click", closeReposModal);

function openUsingNowModal() {
	clearTimeout(usingNowCloseTimer);
	usingNowModal.hidden = false;
	usingNowModal.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => usingNowModal.classList.add("is-open"));
	usingNowClose.focus();
}

function closeUsingNowModal() {
	usingNowModal.classList.remove("is-open");
	usingNowModal.setAttribute("aria-hidden", "true");
	usingNowCloseTimer = setTimeout(() => {
		usingNowModal.hidden = true;
		usingNowTrigger.focus();
	}, 650);
}

usingNowTrigger.addEventListener("click", openUsingNowModal);
usingNowClose.addEventListener("click", closeUsingNowModal);

function animateSectionMove(move, destination, movingSection = draggedSection) {
	if (draggedSection === movingSection) {
		move();
		return;
	}

	const parents = new Set([movingSection.parentNode, destination]);
	const sections = [...new Set([...parents].flatMap((parent) =>
		[...parent.children].filter((item) => item.tagName === "SECTION")
	))];
	const oldPositions = new Map(sections.map((item) => [item, item.getBoundingClientRect()]));
	move();

	const changes = sections.map((item) => {
		const oldPosition = oldPositions.get(item);
		const newPosition = item.getBoundingClientRect();
		return { item, x: oldPosition.left - newPosition.left, y: oldPosition.top - newPosition.top };
	}).filter(({ x, y }) => x || y);
	if (!changes.length) return;

	changes.forEach(({ item, x, y }) => {
		item.classList.add("is-flipping");
		item.style.setProperty("transition", "none", "important");
		item.style.transform = `translate(${x}px, ${y}px)`;
	});
	void changes[0].item.offsetWidth;
	requestAnimationFrame(() => {
		changes.forEach(({ item }) => {
			item.style.removeProperty("transition");
			item.style.transform = "";
		});
	});
}

document.addEventListener("transitionend", (event) => {
	if (event.propertyName !== "transform" || !event.target.matches("section.is-flipping")) return;
	event.target.classList.remove("is-flipping");
});

function moveSectionWithAnimation(target, insertAfter) {
	const anchor = insertAfter ? target.nextSibling : target;
	if (anchor === draggedSection || draggedSection.nextSibling === anchor) return;

	animateSectionMove(() => target.parentNode.insertBefore(draggedSection, anchor), target.parentNode);
}

function moveSectionToEnd(container, section = draggedSection) {
	if (section.parentNode === container && container.lastElementChild === section) return;
	animateSectionMove(() => container.append(section), container, section);
}

function moveSectionVertically(section, direction) {
	const sibling = direction < 0 ? section.previousElementSibling : section.nextElementSibling;
	if (!sibling || sibling.tagName !== "SECTION") return;
	const destination = section.parentNode;
	animateSectionMove(() => {
		if (direction < 0) destination.insertBefore(section, sibling);
		else destination.insertBefore(sibling, section);
	}, destination, section);
}

function makeSectionFloating(section) {
	if (section.classList.contains("is-floating")) return;
	const rect = section.getBoundingClientRect();
	const placeholder = document.createElement("div");
	placeholder.className = "floating-section-placeholder";
	placeholder.style.width = `${rect.width}px`;
	placeholder.style.height = `${rect.height}px`;
	section.parentNode.insertBefore(placeholder, section);
	floatingPlaceholders.set(section, placeholder);
	document.body.append(section);
	section.classList.add("is-floating");
	const width = Math.min(rect.width, window.innerWidth - 16);
	section.style.width = `${width}px`;
	section.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
	section.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - 48))}px`;
	const resizeHandle = floatingResizeHandles.get(section);
	if (resizeHandle) {
		resizeHandle.classList.add("is-active");
	}
	section.querySelector(".section-drag-handle").draggable = false;
	if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		section.animate([
			{ transform: "perspective(900px) rotateX(8deg) scale(.97)", opacity: 0.84 },
			{ transform: "perspective(900px) rotateX(0) scale(1)", opacity: 1 },
		], {
			duration: 420,
			easing: "cubic-bezier(.2, 0, 0, 1)",
		});
	}
}

function makeSectionTiled(section) {
	if (!section.classList.contains("is-floating")) return;
	const resizeHandle = floatingResizeHandles.get(section);
	if (resizeHandle) {
		resizeHandle.classList.remove("is-active");
	}
	const placeholder = floatingPlaceholders.get(section);
	if (placeholder?.parentNode) {
		placeholder.parentNode.insertBefore(section, placeholder);
		placeholder.remove();
	}
	floatingPlaceholders.delete(section);
	section.classList.remove("is-floating");
	section.style.removeProperty("width");
	section.style.removeProperty("height");
	section.style.removeProperty("left");
	section.style.removeProperty("top");
	section.querySelector(".section-drag-handle").draggable = true;
}

window.addEventListener("resize", () => {
	document.querySelectorAll("section.is-floating").forEach((section) => {
		const rect = section.getBoundingClientRect();
		section.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
		section.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - Math.min(rect.height, window.innerHeight - 16) - 8))}px`;
	});
});

function startFloatingSectionMove(section, handle, event) {
	if (!section.classList.contains("is-floating") || event.button !== 0) return;
	event.preventDefault();
	floatingSection = section;
	floatingPointerId = event.pointerId;
	const rect = section.getBoundingClientRect();
	floatingPointerOffsetX = event.clientX - rect.left;
	floatingPointerOffsetY = event.clientY - rect.top;
	handle.setPointerCapture(event.pointerId);
	document.body.classList.add("is-section-moving");
}

function moveFloatingSection(section, event) {
	if (floatingSection !== section || floatingPointerId !== event.pointerId) return;
	const rect = section.getBoundingClientRect();
	const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
	const maxTop = Math.max(8, window.innerHeight - 48);
	section.style.left = `${Math.max(8, Math.min(event.clientX - floatingPointerOffsetX, maxLeft))}px`;
	section.style.top = `${Math.max(8, Math.min(event.clientY - floatingPointerOffsetY, maxTop))}px`;
}

function stopFloatingSectionMove(section, event) {
	if (floatingSection !== section || floatingPointerId !== event.pointerId) return;
	floatingSection = null;
	floatingPointerId = null;
	document.body.classList.remove("is-section-moving");
}

function startFloatingSectionResize(section, handle, event) {
	if (!section.classList.contains("is-floating") || event.button !== 0) return;
	event.preventDefault();
	resizingSection = section;
	resizePointerId = event.pointerId;
	const rect = section.getBoundingClientRect();
	resizeStartX = event.clientX;
	resizeStartY = event.clientY;
	resizeStartWidth = rect.width;
	resizeStartHeight = rect.height;
	handle.setPointerCapture(event.pointerId);
	document.body.classList.add("is-section-resizing");
}

function resizeFloatingSection(section, event) {
	if (resizingSection !== section || resizePointerId !== event.pointerId) return;
	const rect = section.getBoundingClientRect();
	const minWidth = Math.min(240, window.innerWidth - 16);
	const minHeight = 120;
	const maxWidth = Math.max(minWidth, window.innerWidth - rect.left - 8);
	const maxHeight = Math.max(minHeight, window.innerHeight - rect.top - 8);
	section.style.width = `${Math.max(minWidth, Math.min(resizeStartWidth + event.clientX - resizeStartX, maxWidth))}px`;
	section.style.height = `${Math.max(minHeight, Math.min(resizeStartHeight + event.clientY - resizeStartY, maxHeight))}px`;
}

function stopFloatingSectionResize(section, event) {
	if (resizingSection !== section || resizePointerId !== event.pointerId) return;
	resizingSection = null;
	resizePointerId = null;
	document.body.classList.remove("is-section-resizing");
}

function clearDropMarkers() {
	currentDropTarget = null;
	currentDropKind = null;
	currentDropPosition = null;
}

function setDropTarget(target, kind, position = null) {
	if (currentDropTarget === target && currentDropKind === kind && currentDropPosition === position) return false;
	clearDropMarkers();
	currentDropTarget = target;
	currentDropKind = kind;
	currentDropPosition = position;
	return true;
}

document.querySelectorAll(".layout-left > section, .layout-right > section").forEach((section) => {
	section.draggable = false;
	const controls = document.createElement("div");
	controls.className = "section-controls";

	const handle = document.createElement("button");
	handle.className = "section-drag-handle";
	handle.type = "button";
	handle.draggable = true;
	handle.setAttribute("aria-label", "Move section");
	handle.innerHTML = '<img class="section-drag-handle__icon" src="assets/drag.png" alt="" aria-hidden="true">';
	controls.append(handle);

	["up", "down"].forEach((direction) => {
		const button = document.createElement("button");
		button.className = `section-order-button section-order-button--${direction}`;
		button.type = "button";
		button.setAttribute("aria-label", `Move section ${direction}`);
		button.title = `Move ${direction}`;
		button.innerHTML = direction === "up"
			? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"/></svg>'
			: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
		button.addEventListener("click", () => moveSectionVertically(section, direction === "up" ? -1 : 1));
		controls.append(button);
	});

	const sectionModeStatus = document.createElement("span");
	sectionModeStatus.className = "section-mode-status";
	sectionModeStatus.textContent = "Floating";
	controls.append(sectionModeStatus);

	section.prepend(controls);
	const resizeHandle = document.createElement("button");
	resizeHandle.className = "section-resize-handle";
	resizeHandle.type = "button";
	resizeHandle.draggable = false;
	resizeHandle.setAttribute("aria-label", "Resize section");
	resizeHandle.title = "Resize section";
	resizeHandle.innerHTML = '<img src="assets/resize.png" alt="" aria-hidden="true">';
	floatingResizeHandles.set(section, resizeHandle);
	section.append(resizeHandle);
	handle.addEventListener("pointerdown", (event) => startFloatingSectionMove(section, handle, event));
	handle.addEventListener("pointermove", (event) => moveFloatingSection(section, event));
	handle.addEventListener("pointerup", (event) => stopFloatingSectionMove(section, event));
	handle.addEventListener("pointercancel", (event) => stopFloatingSectionMove(section, event));
	resizeHandle.addEventListener("pointerdown", (event) => startFloatingSectionResize(section, resizeHandle, event));
	resizeHandle.addEventListener("pointermove", (event) => resizeFloatingSection(section, event));
	resizeHandle.addEventListener("pointerup", (event) => stopFloatingSectionResize(section, event));
	resizeHandle.addEventListener("pointercancel", (event) => stopFloatingSectionResize(section, event));

	section.addEventListener("dragstart", (event) => {
		if (!event.target.closest(".section-drag-handle")) {
			event.preventDefault();
			return;
		}
		draggedSection = section;
		document.body.classList.add("is-section-moving");
		clearDropMarkers();
		section.classList.add("is-dragging");
		const rect = section.getBoundingClientRect();
		const grabX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
		const grabY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
		event.dataTransfer.setDragImage(section, Math.round(grabX), Math.round(grabY));
	});

	section.addEventListener("dragend", () => {
		section.classList.remove("is-dragging");
		document.body.classList.remove("is-section-moving");
		clearDropMarkers();
		draggedSection = null;
		if (dragFrame) cancelAnimationFrame(dragFrame);
		dragFrame = 0;
	});
});

document.addEventListener("dragover", (event) => {
	if (!draggedSection) return;
	event.preventDefault();
	event.dataTransfer.dropEffect = "move";
	dragPointerX = event.clientX;
	dragPointerY = event.clientY;
	if (dragFrame) return;
	dragFrame = requestAnimationFrame(() => {
		dragFrame = 0;
		if (!draggedSection) return;
		const pointerColumn = [...document.querySelectorAll(".layout-left, .layout-right")].find((column) => {
			const rect = column.getBoundingClientRect();
			return dragPointerX >= rect.left && dragPointerX <= rect.right &&
				dragPointerY >= rect.top && dragPointerY <= rect.bottom;
		});
		if (pointerColumn && pointerColumn !== draggedSection.parentElement) {
			if (setDropTarget(pointerColumn, "column")) moveSectionToEnd(pointerColumn);
			return;
		}

		const target = document.elementsFromPoint(dragPointerX, dragPointerY)
			.find((item) => !draggedSection.contains(item));
		if (!target) {
			clearDropMarkers();
			return;
		}

		const targetSection = target.closest("section:not(.is-floating)");
		if (targetSection && targetSection !== draggedSection &&
			(!pointerColumn || targetSection.parentElement === pointerColumn)) {
			const insertAfter = dragPointerY > targetSection.getBoundingClientRect().top + targetSection.offsetHeight / 2;
			if (setDropTarget(targetSection, "section", insertAfter ? "after" : "before")) {
				moveSectionWithAnimation(targetSection, insertAfter);
			}
			return;
		}

		const targetColumn = pointerColumn || target.closest(".layout-left, .layout-right");
		if (targetColumn) {
			if (setDropTarget(targetColumn, "column")) moveSectionToEnd(targetColumn);
			return;
		}

		clearDropMarkers();
	});
});

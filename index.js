let draggedSection;
let currentDropTarget = null;
let currentDropKind = null;
let currentDropPosition = null;
let dragFrame = 0;
let dragPointerX = 0;
let dragPointerY = 0;
const resetButton = document.getElementById("reset-site");
const exitButton = document.getElementById("exit-site");
const helpButton = document.getElementById("help-site");
const helpModal = document.getElementById("help-modal");
const helpClose = helpModal.querySelector(".telegram-modal__close");
const testWarningModal = document.getElementById("test-warning-modal");
const testWarningClose = testWarningModal.querySelector(".telegram-modal__close");
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
const inspectMenuItem = desktopContextMenu.querySelector(".desktop-context-menu__item");
const inspectModal = document.getElementById("inspect-modal");
const inspectClose = inspectModal.querySelector(".telegram-modal__close");
const inspectModalLink = document.getElementById("inspect-modal-link");
const inspectCopyButton = document.getElementById("inspect-modal-copy");
const inspectCopyLabel = inspectCopyButton.querySelector("span");
let inspectCloseTimer;
let inspectCopyTimer;
let inspectedHref = window.location.href;
let contextMenuReturnFocus = null;

function closeDesktopContextMenu() {
	desktopContextMenu.hidden = true;
}

document.addEventListener("contextmenu", (event) => {
	if (!(event.target instanceof Element)) return;
	if (event.target.closest(".layout-right > section")) {
		closeDesktopContextMenu();
		return;
	}
	if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
	if (desktopContextMenu.contains(event.target)) return;
	const clickedLink = event.target.closest("a[href]");
	if (!clickedLink) return;
	event.preventDefault();
	contextMenuReturnFocus = document.activeElement;
	inspectedHref = clickedLink.href;
	desktopContextMenu.hidden = false;
	const left = Math.min(event.clientX, window.innerWidth - desktopContextMenu.offsetWidth - 8);
	const top = Math.min(event.clientY, window.innerHeight - desktopContextMenu.offsetHeight - 8);
	desktopContextMenu.style.left = `${Math.max(8, left)}px`;
	desktopContextMenu.style.top = `${Math.max(8, top)}px`;
});

document.addEventListener("pointerdown", (event) => {
	if (!desktopContextMenu.hidden && !desktopContextMenu.contains(event.target)) {
		closeDesktopContextMenu();
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") closeDesktopContextMenu();
});

function openInspectModal() {
	clearTimeout(inspectCloseTimer);
	inspectModalLink.href = inspectedHref;
	inspectModalLink.textContent = inspectedHref;
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
	closeDesktopContextMenu();
	openInspectModal();
});

inspectCopyButton.addEventListener("click", async () => {
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

const telegramTrigger = document.querySelector(".telegram-trigger");
const telegramModal = document.getElementById("telegram-modal");
const telegramClose = telegramModal.querySelector(".telegram-modal__close");
const aboutTrigger = document.querySelector(".about-trigger");
const aboutModal = document.getElementById("about-modal");
const aboutClose = aboutModal.querySelector(".telegram-modal__close");
const interestsTrigger = document.querySelector(".interests-trigger");
const interestsModal = document.getElementById("interests-modal");
const interestsClose = interestsModal.querySelector(".telegram-modal__close");
const usingNowTrigger = document.querySelector(".using-now-trigger");
const usingNowModal = document.getElementById("using-now-modal");
const usingNowClose = usingNowModal.querySelector(".telegram-modal__close");
let telegramCloseTimer;
let aboutCloseTimer;
let interestsCloseTimer;
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
	testWarningClose.focus();
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
		telegramTrigger.focus();
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

	section.prepend(controls);

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
		event.dataTransfer.setDragImage(section, Math.round(rect.width / 2), 24);
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

		const targetSection = target.closest("section");
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

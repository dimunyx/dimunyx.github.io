let draggedSection;
let currentDropTarget = null;
let currentDropKind = null;
let currentDropPosition = null;
let dragFrame = 0;
let dragPointerX = 0;
let dragPointerY = 0;
const resetButton = document.getElementById("reset-site");
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
const telegramTrigger = document.querySelector(".telegram-trigger");
const telegramModal = document.getElementById("telegram-modal");
const telegramClose = telegramModal.querySelector(".telegram-modal__close");
const aboutTrigger = document.querySelector(".about-trigger");
const aboutModal = document.getElementById("about-modal");
const aboutClose = aboutModal.querySelector(".telegram-modal__close");
const interestsTrigger = document.querySelector(".interests-trigger");
const interestsModal = document.getElementById("interests-modal");
const interestsClose = interestsModal.querySelector(".telegram-modal__close");
let telegramCloseTimer;
let aboutCloseTimer;
let interestsCloseTimer;

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
telegramModal.addEventListener("click", (event) => {
	if (event.target === telegramModal) closeTelegramModal();
});

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
aboutModal.addEventListener("click", (event) => {
	if (event.target === aboutModal) closeAboutModal();
});

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
interestsModal.addEventListener("click", (event) => {
	if (event.target === interestsModal) closeInterestsModal();
});
document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && !telegramModal.hidden) closeTelegramModal();
	if (event.key === "Escape" && !aboutModal.hidden) closeAboutModal();
	if (event.key === "Escape" && !interestsModal.hidden) closeInterestsModal();
});

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

	["left", "right"].forEach((side) => {
		const button = document.createElement("button");
		button.className = `section-column-button section-column-button--${side}`;
		button.type = "button";
		button.setAttribute("aria-label", `Move section to ${side} column`);
		button.title = `Move to ${side} column`;
		button.innerHTML = `<img src="assets/${side}.png" alt="" aria-hidden="true" draggable="false">`;
		button.addEventListener("click", () => {
			const column = document.querySelector(side === "left" ? ".layout-left" : ".layout-right");
			moveSectionToEnd(column, section);
		});
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

		if (!target.closest(".layout") && !target.closest(".telegram-modal")) {
			if (setDropTarget(document.body, "body")) moveSectionToEnd(document.body);
		}
	});
});

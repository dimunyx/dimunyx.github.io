/* Layout: section registry, controls, drag & drop, floating windows, persistence. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element, clamp, motionAllowed, isEditableTarget } = {
		element: DX.util.element,
		clamp: DX.util.clamp,
		motionAllowed: DX.motion.allowed,
		isEditableTarget: DX.util.isEditableTarget,
	};

	const LAYOUT_KEY = "dimunyx-layout-v1";
	const LAYOUT_VERSION = 2;

	const CONTAINER_IDS = { left: "layout-left", right: "layout-right", page: "page-container" };

	const sections = new Map();
	const containers = {};
	const floatingHandles = new Map();
	const floatingPlaceholders = new Map();
	const resizeHandles = new Map();

	let layoutState = { version: LAYOUT_VERSION, active: "main", workspaces: {} };
	let persistTimer = 0;
	let activeWorkspaceId = "main";

	/* ------------------------------------------------------------------ *
	 * Storage
	 * ------------------------------------------------------------------ */

	function readLayoutState() {
		try {
			const raw = localStorage.getItem(LAYOUT_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== "object" || parsed.version !== LAYOUT_VERSION) return null;
			if (typeof parsed.workspaces !== "object" || parsed.workspaces === null) return null;
			return parsed;
		} catch (error) {
			console.warn("[dimunyx] could not read layout", error);
			return null;
		}
	}

	function persist() {
		clearTimeout(persistTimer);
		persistTimer = window.setTimeout(() => {
			try {
				localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutState));
			} catch (error) {
				console.warn("[dimunyx] could not save layout", error);
			}
		}, 180);
	}

	function workspaceDefinition(id) {
		return DX.WORKSPACES.find((workspace) => workspace.id === id) || DX.WORKSPACES[0];
	}

	function emptyOrder() {
		return { left: [], right: [], page: [] };
	}

	function cloneOrder(order) {
		const copy = emptyOrder();
		for (const key of Object.keys(copy)) {
			if (Array.isArray(order?.[key])) copy[key] = order[key].filter((name) => typeof name === "string");
		}
		return copy;
	}

	function defaultStateFor(id, options = {}) {
		const definition = workspaceDefinition(id);
		const state = { order: cloneOrder(definition.default), floating: {} };
		const preferFloating = options.respectMode !== false && DX.settings.get().defaultSectionMode === "floating";
		if (preferFloating) {
			let index = 0;
			for (const key of ["left", "right", "page"]) {
				for (const name of state.order[key]) {
					state.floating[name] = { left: 24 + index * 28, top: 24 + index * 28, width: 420 };
					index += 1;
				}
			}
		}
		return state;
	}

	function stateFor(id) {
		if (!layoutState.workspaces[id] || typeof layoutState.workspaces[id] !== "object") {
			layoutState.workspaces[id] = defaultStateFor(id);
		}
		const state = layoutState.workspaces[id];
		if (!state.order || typeof state.order !== "object") state.order = cloneOrder(workspaceDefinition(id).default);
		if (!state.floating || typeof state.floating !== "object") state.floating = {};
		return state;
	}

	/* ------------------------------------------------------------------ *
	 * Capture / normalize
	 * ------------------------------------------------------------------ */

	function containerKeyOf(parent) {
		for (const [key, node] of Object.entries(containers)) {
			if (node === parent) return key;
		}
		return null;
	}

	function geometryOf(section) {
		const rect = section.getBoundingClientRect();
		return {
			left: Math.round(parseFloat(section.style.left) || rect.left),
			top: Math.round(parseFloat(section.style.top) || rect.top),
			width: Math.round(rect.width),
			height: Math.round(rect.height),
		};
	}

	function captureWorkspace(id) {
		const state = { order: emptyOrder(), floating: {} };
		for (const [key, node] of Object.entries(containers)) {
			for (const child of node.children) {
				if (!(child instanceof HTMLElement)) continue;
				const name = child.dataset.section;
				if (!name || !sections.has(name)) continue;
				if (!belongs(id, name)) continue;
				state.order[key].push(name);
				if (child.classList.contains("is-floating")) state.floating[name] = geometryOf(child);
			}
		}
		/* Sections parked in the store still belong to the workspace: keep them listed. */
		const placed = new Set(Object.values(state.order).flat());
		for (const name of sectionNames(id)) {
			if (!placed.has(name)) state.order.left.push(name);
		}
		return state;
	}

	function belongs(id, name) {
		const definition = workspaceDefinition(id);
		return definition.sections.includes(name);
	}

	function sectionNames(id) {
		return workspaceDefinition(id).sections.filter((name) => sections.has(name));
	}

	/* ------------------------------------------------------------------ *
	 * Floating / tiling
	 * ------------------------------------------------------------------ */

	function normalizeSection(section) {
		if (!section.classList.contains("is-floating")) return;
		const placeholder = floatingPlaceholders.get(section);
		if (placeholder?.parentNode) placeholder.remove();
		floatingPlaceholders.delete(section);
		section.classList.remove("is-floating");
		section.style.removeProperty("width");
		section.style.removeProperty("height");
		section.style.removeProperty("left");
		section.style.removeProperty("top");
		const handle = floatingHandles.get(section);
		if (handle) handle.draggable = true;
		const resize = resizeHandles.get(section);
		if (resize) resize.classList.remove("is-active");
	}

	function makeSectionFloating(section, geometry) {
		if (!section) return;
		if (section.classList.contains("is-floating")) {
			if (geometry) applyGeometry(section, geometry);
			return;
		}
		if (!section.parentNode || section.hidden) return;
		const rect = section.getBoundingClientRect();
		const placeholder = document.createElement("div");
		placeholder.className = "floating-section-placeholder";
		placeholder.style.width = `${rect.width}px`;
		placeholder.style.height = `${rect.height}px`;
		placeholder.dataset.placeholderFor = section.dataset.section || "";
		section.parentNode.insertBefore(placeholder, section);
		floatingPlaceholders.set(section, placeholder);
		document.body.append(section);
		section.classList.add("is-floating");
		const width = clamp(rect.width, 200, window.innerWidth - 16);
		section.style.width = `${width}px`;
		if (geometry) {
			applyGeometry(section, geometry);
		} else {
			section.style.left = `${clamp(rect.left, 8, Math.max(8, window.innerWidth - width - 8))}px`;
			section.style.top = `${clamp(rect.top, 8, Math.max(8, window.innerHeight - 48))}px`;
		}
		const handle = floatingHandles.get(section);
		if (handle) handle.draggable = false;
		const resize = resizeHandles.get(section);
		if (resize) resize.classList.add("is-active");
		if (DX.motion.sectionEffects()) {
			section.animate(
				[
					{ transform: "perspective(900px) rotateX(8deg) scale(.97)", opacity: 0.84 },
					{ transform: "perspective(900px) rotateX(0) scale(1)", opacity: 1 },
				],
				{ duration: 420, easing: "cubic-bezier(.2, 0, 0, 1)" },
			);
		}
	}

	function applyGeometry(section, geometry) {
		const width = clamp(geometry.width || section.offsetWidth, 200, window.innerWidth - 16);
		section.style.width = `${width}px`;
		section.style.left = `${clamp(geometry.left ?? 8, 8, Math.max(8, window.innerWidth - width - 8))}px`;
		section.style.top = `${clamp(geometry.top ?? 8, 8, Math.max(8, window.innerHeight - 48))}px`;
		if (geometry.height) section.style.height = `${Math.max(120, geometry.height)}px`;
	}

	function makeSectionTiled(section) {
		if (!section || !section.classList.contains("is-floating")) return;
		const placeholder = floatingPlaceholders.get(section);
		const parent = placeholder?.parentNode || null;
		const anchor = placeholder?.nextSibling || null;
		normalizeSection(section);
		if (parent) parent.insertBefore(section, anchor);
		else containers.left.append(section);
	}

	function toggleSectionFloating(section, floating) {
		if (!section) return;
		if (floating) makeSectionFloating(section);
		else makeSectionTiled(section);
		changed();
	}

	/* ------------------------------------------------------------------ *
	 * Move animation (FLIP)
	 * ------------------------------------------------------------------ */

	function animateSectionMove(move, destination, movingSection) {
		if (!motionAllowed() || !DX.settings.get().windowEffects) {
			move();
			return;
		}
		const parents = new Set([movingSection.parentNode, destination]);
		const affected = [...new Set([...parents].flatMap((parent) => [...parent.children].filter((item) => item.tagName === "SECTION")))];
		const before = new Map(affected.map((item) => [item, item.getBoundingClientRect()]));
		move();
		const changes = affected
			.map((item) => {
				const oldRect = before.get(item);
				const newRect = item.getBoundingClientRect();
				return { item, x: oldRect.left - newRect.left, y: oldRect.top - newRect.top };
			})
			.filter((change) => change.x || change.y);
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
		if (event.propertyName === "transform" && event.target instanceof Element && event.target.matches("section.is-flipping")) {
			event.target.classList.remove("is-flipping");
		}
	});

	/* ------------------------------------------------------------------ *
	 * Drag & drop state
	 * ------------------------------------------------------------------ */

	let draggedSection = null;
	let dropTarget = null;
	let dropKind = null;
	let dropPosition = null;
	let dragFrame = 0;
	let dragPointerX = 0;
	let dragPointerY = 0;
	let contextSection = null;

	function clearDropMarkers() {
		dropTarget = null;
		dropKind = null;
		dropPosition = null;
	}

	function setDropTarget(target, kind, position = null) {
		if (dropTarget === target && dropKind === kind && dropPosition === position) return false;
		clearDropMarkers();
		dropTarget = target;
		dropKind = kind;
		dropPosition = position;
		return true;
	}

	function moveSectionWithAnimation(target, insertAfter) {
		const anchor = insertAfter ? target.nextSibling : target;
		if (anchor === draggedSection || draggedSection.nextSibling === anchor) return;
		animateSectionMove(() => target.parentNode.insertBefore(draggedSection, anchor), target.parentNode, draggedSection);
	}

	function moveSectionToEnd(container, section = draggedSection) {
		if (!section || !container) return;
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
		changed();
	}

	function resolveDropAt(x, y) {
		if (!draggedSection) return;
		const pointerColumn = Object.values(containers).find((column) => {
			const rect = column.getBoundingClientRect();
			return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
		});
		if (pointerColumn && pointerColumn !== draggedSection.parentElement) {
			if (setDropTarget(pointerColumn, "column")) moveSectionToEnd(pointerColumn);
			return;
		}
		const target = document.elementsFromPoint(x, y).find((item) => !draggedSection.contains(item));
		if (!target) {
			clearDropMarkers();
			return;
		}
		const targetSection = target.closest("[data-section]");
		if (targetSection && targetSection !== draggedSection && !targetSection.hidden && !targetSection.classList.contains("is-floating")) {
			const rect = targetSection.getBoundingClientRect();
			const insertAfter = y > rect.top + rect.height / 2;
			if (setDropTarget(targetSection, "section", insertAfter ? "after" : "before")) {
				moveSectionWithAnimation(targetSection, insertAfter);
			}
			return;
		}
		const targetColumn = pointerColumn || target.closest(".layout-left, .layout-right, .page-container");
		if (targetColumn) {
			if (setDropTarget(targetColumn, "column")) moveSectionToEnd(targetColumn);
			return;
		}
		clearDropMarkers();
	}

	function scheduleDropResolve() {
		if (dragFrame) return;
		dragFrame = requestAnimationFrame(() => {
			dragFrame = 0;
			resolveDropAt(dragPointerX, dragPointerY);
		});
	}

	function startDrag(section, event) {
		draggedSection = section;
		document.body.classList.add("is-section-moving");
		clearDropMarkers();
		section.classList.add("is-dragging");
		if (event?.dataTransfer) {
			const rect = section.getBoundingClientRect();
			const grabX = clamp(event.clientX - rect.left, 0, rect.width);
			const grabY = clamp(event.clientY - rect.top, 0, rect.height);
			event.dataTransfer.effectAllowed = "move";
			try {
				event.dataTransfer.setDragImage(section, Math.round(grabX), Math.round(grabY));
			} catch {
				/* some engines reject synthetic drag images */
			}
		}
	}

	function endDrag() {
		if (!draggedSection) return;
		draggedSection.classList.remove("is-dragging");
		document.body.classList.remove("is-section-moving");
		clearDropMarkers();
		draggedSection = null;
		if (dragFrame) cancelAnimationFrame(dragFrame);
		dragFrame = 0;
		changed();
	}

	/* ------------------------------------------------------------------ *
	 * Pointer-driven drag for touch / pen (HTML5 DnD is unreliable there)
	 * ------------------------------------------------------------------ */

	let pointerDragHandle = null;
	let pointerDragId = null;

	function onHandlePointerDown(event) {
		const section = event.currentTarget.closest("[data-section]");
		if (!section || section.classList.contains("is-floating")) return;
		if (event.pointerType === "mouse") return; /* mouse keeps native HTML5 drag */
		event.preventDefault();
		pointerDragHandle = event.currentTarget;
		pointerDragId = event.pointerId;
		pointerDragHandle.setPointerCapture?.(event.pointerId);
		startDrag(section, null);
		dragPointerX = event.clientX;
		dragPointerY = event.clientY;
		resolveDropAt(dragPointerX, dragPointerY);
	}

	function onHandlePointerMove(event) {
		if (pointerDragId !== event.pointerId || !pointerDragHandle) return;
		event.preventDefault();
		dragPointerX = event.clientX;
		dragPointerY = event.clientY;
		scheduleDropResolve();
	}

	function onHandlePointerEnd(event) {
		if (pointerDragId !== event.pointerId) return;
		try {
			pointerDragHandle?.releasePointerCapture?.(event.pointerId);
		} catch {
			/* pointer capture may already be gone */
		}
		pointerDragHandle = null;
		pointerDragId = null;
		endDrag();
	}

	/* ------------------------------------------------------------------ *
	 * Floating window move / resize (Pointer Events, works on touch)
	 * ------------------------------------------------------------------ */

	let movingSection = null;
	let movePointerId = null;
	let moveOffsetX = 0;
	let moveOffsetY = 0;
	let resizingSection = null;
	let resizePointerId = null;
	let resizeStartX = 0;
	let resizeStartY = 0;
	let resizeStartWidth = 0;
	let resizeStartHeight = 0;

	function onMovePointerDown(event) {
		const section = event.currentTarget.closest("[data-section]");
		if (!section || !section.classList.contains("is-floating") || event.button !== 0) return;
		event.preventDefault();
		movingSection = section;
		movePointerId = event.pointerId;
		const rect = section.getBoundingClientRect();
		moveOffsetX = event.clientX - rect.left;
		moveOffsetY = event.clientY - rect.top;
		event.currentTarget.setPointerCapture?.(event.pointerId);
		document.body.classList.add("is-section-moving");
	}

	function onMovePointerMove(event) {
		if (movingSection !== event.currentTarget.closest("[data-section]") || movePointerId !== event.pointerId) return;
		const rect = movingSection.getBoundingClientRect();
		movingSection.style.left = `${clamp(event.clientX - moveOffsetX, 8, Math.max(8, window.innerWidth - rect.width - 8))}px`;
		movingSection.style.top = `${clamp(event.clientY - moveOffsetY, 8, Math.max(8, window.innerHeight - 48))}px`;
	}

	function onMovePointerEnd(event) {
		if (movingSection !== event.currentTarget.closest("[data-section]") || movePointerId !== event.pointerId) return;
		movingSection = null;
		movePointerId = null;
		document.body.classList.remove("is-section-moving");
		changed();
	}

	function onResizePointerDown(event) {
		const section = event.currentTarget.closest("[data-section]");
		if (!section || !section.classList.contains("is-floating") || event.button !== 0) return;
		event.preventDefault();
		resizingSection = section;
		resizePointerId = event.pointerId;
		const rect = section.getBoundingClientRect();
		resizeStartX = event.clientX;
		resizeStartY = event.clientY;
		resizeStartWidth = rect.width;
		resizeStartHeight = rect.height;
		event.currentTarget.setPointerCapture?.(event.pointerId);
		document.body.classList.add("is-section-resizing");
	}

	function onResizePointerMove(event) {
		if (resizingSection !== event.currentTarget.closest("[data-section]") || resizePointerId !== event.pointerId) return;
		const rect = resizingSection.getBoundingClientRect();
		const maxWidth = Math.max(240, window.innerWidth - rect.left - 8);
		const maxHeight = Math.max(120, window.innerHeight - rect.top - 8);
		resizingSection.style.width = `${clamp(resizeStartWidth + event.clientX - resizeStartX, 200, maxWidth)}px`;
		resizingSection.style.height = `${clamp(resizeStartHeight + event.clientY - resizeStartY, 120, maxHeight)}px`;
	}

	function onResizePointerEnd(event) {
		if (resizingSection !== event.currentTarget.closest("[data-section]") || resizePointerId !== event.pointerId) return;
		resizingSection = null;
		resizePointerId = null;
		document.body.classList.remove("is-section-resizing");
		changed();
	}

	/* ------------------------------------------------------------------ *
	 * Section controls
	 * ------------------------------------------------------------------ */

	function buildControls(section) {
		const controls = document.createElement("div");
		controls.className = "section-controls";

		const handle = document.createElement("button");
		handle.className = "section-drag-handle";
		handle.type = "button";
		handle.draggable = true;
		handle.setAttribute("aria-label", "Move section");
		handle.title = "Drag to move, right click for layout";
		handle.innerHTML = '<img class="section-drag-handle__icon" src="assets/drag.png" alt="" aria-hidden="true">';
		controls.append(handle);
		floatingHandles.set(section, handle);

		["up", "down"].forEach((direction) => {
			const button = document.createElement("button");
			button.className = `section-order-button section-order-button--${direction}`;
			button.type = "button";
			button.setAttribute("aria-label", `Move section ${direction}`);
			button.title = `Move ${direction}`;
			button.innerHTML =
				direction === "up"
					? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"/></svg>'
					: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
			button.addEventListener("click", () => moveSectionVertically(section, direction === "up" ? -1 : 1));
			controls.append(button);
		});

		const status = document.createElement("span");
		status.className = "section-mode-status";
		status.textContent = "Floating";
		controls.append(status);

		section.prepend(controls);

		const resize = document.createElement("button");
		resize.className = "section-resize-handle";
		resize.type = "button";
		resize.draggable = false;
		resize.setAttribute("aria-label", "Resize section");
		resize.title = "Resize section";
		resize.innerHTML = '<img src="assets/resize.png" alt="" aria-hidden="true">';
		section.append(resize);
		resizeHandles.set(section, resize);

		handle.addEventListener("pointerdown", onHandlePointerDown);
		handle.addEventListener("pointermove", onHandlePointerMove);
		handle.addEventListener("pointerup", onHandlePointerEnd);
		handle.addEventListener("pointercancel", onHandlePointerEnd);

		handle.addEventListener("pointerdown", onMovePointerDown);
		handle.addEventListener("pointermove", onMovePointerMove);
		handle.addEventListener("pointerup", onMovePointerEnd);
		handle.addEventListener("pointercancel", onMovePointerEnd);

		resize.addEventListener("pointerdown", onResizePointerDown);
		resize.addEventListener("pointermove", onResizePointerMove);
		resize.addEventListener("pointerup", onResizePointerEnd);
		resize.addEventListener("pointercancel", onResizePointerEnd);

		section.addEventListener("dragstart", (event) => {
			if (section.hidden || section.classList.contains("is-floating")) {
				event.preventDefault();
				return;
			}
			if (!event.target.closest(".section-drag-handle")) {
				event.preventDefault();
				return;
			}
			startDrag(section, event);
		});

		section.addEventListener("dragend", endDrag);
	}

	/* ------------------------------------------------------------------ *
	 * Applying a workspace layout
	 * ------------------------------------------------------------------ */

	function parkSection(section) {
		normalizeSection(section);
		section.hidden = true;
		const store = element("section-store");
		if (store && section.parentNode !== store) store.append(section);
	}

	function unparkSection(section) {
		section.hidden = false;
	}

	function defaultContainerFor(id, name) {
		const definition = workspaceDefinition(id);
		for (const [key, names] of Object.entries(definition.default)) {
			if (names.includes(name)) return key;
		}
		return "left";
	}

	function placeWorkspace(id, options = {}) {
		const definition = workspaceDefinition(id);
		const members = definition.sections.filter((name) => sections.has(name));

		for (const [name, section] of sections) {
			if (!members.includes(name)) parkSection(section);
		}

		const detached = [];
		for (const name of members) {
			const section = sections.get(name);
			normalizeSection(section);
			unparkSection(section);
			section.remove();
			detached.push(section);
		}

		for (const key of Object.keys(containers)) {
			for (const child of [...containers[key].children]) {
				if (child.dataset?.section && sections.has(child.dataset.section)) child.remove();
			}
		}

		const state = options.state || stateFor(id);
		const placed = new Set();

		for (const [key, node] of Object.entries(containers)) {
			for (const name of state.order[key] || []) {
				if (placed.has(name) || !sections.has(name) || !members.includes(name)) continue;
				node.append(sections.get(name));
				placed.add(name);
			}
		}

		for (const section of detached) {
			const name = section.dataset.section;
			if (placed.has(name)) continue;
			containers[defaultContainerFor(id, name)].append(section);
			placed.add(name);
		}

		for (const [name, geometry] of Object.entries(state.floating || {})) {
			const section = sections.get(name);
			if (section && !section.hidden) makeSectionFloating(section, geometry);
		}
	}

	function applyWorkspace(id, options = {}) {
		if (options.persistCurrent !== false && activeWorkspaceId && activeWorkspaceId !== id) {
			layoutState.workspaces[activeWorkspaceId] = captureWorkspace(activeWorkspaceId);
		}
		activeWorkspaceId = id;
		layoutState.active = id;
		placeWorkspace(id, options);
		persist();
		notifyLayout();
		if (options.animate !== false) animateWorkspaceSwitch();
	}

	function animateWorkspaceSwitch() {
		if (!motionAllowed()) return;
		for (const node of Object.values(containers)) {
			node.animate(
				[
					{ opacity: 0, transform: "translateY(12px)" },
					{ opacity: 1, transform: "translateY(0)" },
				],
				{ duration: DX.motion.duration("workspace"), easing: "cubic-bezier(.2, 0, 0, 1)" },
			);
		}
	}

	function changed() {
		layoutState.workspaces[activeWorkspaceId] = captureWorkspace(activeWorkspaceId);
		persist();
		notifyLayout();
	}

	function notifyLayout() {
		DX.events.emit("layout-changed", {
			workspace: activeWorkspaceId,
			...counts(),
		});
	}

	function counts() {
		const definition = workspaceDefinition(activeWorkspaceId);
		let floating = 0;
		let tiled = 0;
		for (const name of definition.sections) {
			const section = sections.get(name);
			if (!section || section.hidden) continue;
			if (section.classList.contains("is-floating")) floating += 1;
			else tiled += 1;
		}
		return { tiled, floating, total: tiled + floating };
	}

	function layoutLabel() {
		const { floating } = counts();
		return floating === 0 ? "Tiling" : `Tiling + ${floating} floating`;
	}

	function resetActiveLayout() {
		const state = defaultStateFor(activeWorkspaceId, { respectMode: false });
		layoutState.workspaces[activeWorkspaceId] = state;
		placeWorkspace(activeWorkspaceId, { state });
		persist();
		notifyLayout();
	}

	/* ------------------------------------------------------------------ *
	 * Init
	 * ------------------------------------------------------------------ */

	function init() {
		for (const [key, id] of Object.entries(CONTAINER_IDS)) {
			containers[key] = element(id);
		}
		document.querySelectorAll("[data-section]").forEach((section) => {
			sections.set(section.dataset.section, section);
			buildControls(section);
		});

		const stored = readLayoutState();
		if (stored) {
			layoutState = stored;
			if (!DX.WORKSPACES.some((workspace) => workspace.id === layoutState.active)) layoutState.active = "main";
		} else {
			layoutState = { version: LAYOUT_VERSION, active: DX.settings.get().startupWorkspace, workspaces: {} };
		}
		activeWorkspaceId = layoutState.active;

		document.addEventListener("dragover", (event) => {
			if (!draggedSection) return;
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
			dragPointerX = event.clientX;
			dragPointerY = event.clientY;
			scheduleDropResolve();
		});

		document.addEventListener("drop", (event) => {
			if (!draggedSection) return;
			event.preventDefault();
		});

		window.addEventListener("resize", () => {
			for (const section of document.querySelectorAll("[data-section].is-floating")) {
				applyGeometry(section, geometryOf(section));
			}
		});
	}

	DX.layout = {
		init,
		sections: () => sections,
		get: (name) => sections.get(name),
		applyWorkspace,
		resetActiveLayout,
		changed,
		layoutLabel,
		counts,
		activeWorkspace: () => activeWorkspaceId,
		toggleFloating: (section, floating) => toggleSectionFloating(section, floating),
		makeFloating: makeSectionFloating,
		makeTiled: makeSectionTiled,
		contextSection: () => contextSection,
		clearContextSection: () => {
			contextSection = null;
		},
		storageKey: LAYOUT_KEY,
	};
})();

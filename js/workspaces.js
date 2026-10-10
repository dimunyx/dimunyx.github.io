/* Workspaces: definitions, switching, keyboard shortcuts, switcher UI. */
(function () {
	"use strict";

	const DX = window.DX;

	const WORKSPACES = [
		{
			id: "main",
			label: "Main",
			sections: ["about", "using-now", "interests", "experience", "social", "nixwebring"],
			default: { left: ["about", "using-now", "interests", "experience", "social"], right: [], page: ["nixwebring"] },
		},
		{
			id: "projects",
			label: "Projects",
			sections: ["projects"],
			default: { left: ["projects"], right: [], page: [] },
		},
		{
			id: "design",
			label: "Design",
			sections: ["palette"],
			default: { left: ["palette"], right: [], page: [] },
		},
	];

	DX.WORKSPACES = WORKSPACES;

	let activeId = "main";
	let switcherButtons = [];

	function byId(id) {
		return WORKSPACES.find((workspace) => workspace.id === id) || null;
	}

	function active() {
		return byId(activeId) || WORKSPACES[0];
	}

	function setActive(id, options = {}) {
		const workspace = byId(id);
		if (!workspace) return false;
		activeId = workspace.id;
		syncSwitcher();
		DX.events.emit("workspace-changed", { workspace: workspace.id, label: workspace.label, ...DX.layout.counts() });
		if (options.notify !== false) return true;
		return true;
	}

	function switchTo(id, options = {}) {
		const workspace = byId(id);
		if (!workspace) return false;
		if (workspace.id === activeId && !options.force) return false;
		DX.layout.applyWorkspace(workspace.id, { animate: options.animate !== false });
		setActive(workspace.id);
		return true;
	}

	function syncSwitcher() {
		for (const button of switcherButtons) {
			const isActive = button.dataset.workspace === activeId;
			button.setAttribute("aria-pressed", String(isActive));
		}
	}

	function step(delta) {
		const index = WORKSPACES.findIndex((workspace) => workspace.id === activeId);
		const next = WORKSPACES[(index + delta + WORKSPACES.length) % WORKSPACES.length];
		switchTo(next.id);
	}

	function init() {
		switcherButtons = [...document.querySelectorAll("[data-workspace]")];
		switcherButtons.forEach((button) => {
			button.addEventListener("click", () => switchTo(button.dataset.workspace));
		});

		document.addEventListener("keydown", (event) => {
			if (event.defaultPrevented || event.altKey || event.metaKey || !event.ctrlKey) return;
			if (DX.util.isEditableTarget(event.target)) return;

			const digit = event.key.match(/^[1-9]$/);
			if (digit) {
				const index = Number(digit[0]) - 1;
				if (WORKSPACES[index]) {
					event.preventDefault();
					switchTo(WORKSPACES[index].id);
				}
				return;
			}

			if (event.key === "ArrowRight" || event.key === "PageDown") {
				event.preventDefault();
				step(1);
			} else if (event.key === "ArrowLeft" || event.key === "PageUp") {
				event.preventDefault();
				step(-1);
			}
		});

		activeId = DX.layout.activeWorkspace();
		if (!byId(activeId)) activeId = "main";
		syncSwitcher();
	}

	DX.workspaces = {
		init,
		list: () => WORKSPACES,
		active,
		activeId: () => activeId,
		switchTo,
		label: (id) => byId(id)?.label || id,
	};
})();

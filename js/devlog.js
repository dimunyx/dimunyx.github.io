/* Devlog: changelog timeline for the site, driven by a static entries array.
   To add an entry, push a new object to ENTRIES — nothing else is needed. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	/* Filter categories. Entries pick one of these; unknown values fall back to "Website". */
	const CATEGORIES = ["Website", "Linux", "Projects", "Experiments"];
	const KIND_LABELS = { major: "Major", minor: "Minor" };
	const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	/* Every date and change below is taken from the real git history of this
	   repository — nothing here is invented. */
	const ENTRIES = [
		{
			id: "v035-arch-linux-backup",
			date: "2026-10-29",
			title: "v0.3.5 — Arch Linux Backup",
			category: "Projects",
			kind: "minor",
			description: "The Projects workspace now features the Arch-Linux-Backup repository.",
			changes: [
				"Added Arch-Linux-Backup to the Linux category",
			],
		},
		{
			id: "v034-projects",
			date: "2026-10-28",
			title: "v0.3.4 — responsive layout and Projects refresh",
			category: "Projects",
			kind: "minor",
			description: "The site layout and Projects workspace got a responsive refresh, with clearer repository cards and an animated hero.",
			changes: [
				"Added dimunyx, Noctalia and Bibata Modern Catppuccin Mocha Blue to the repository explorer",
				"Added the Favorite filter and marked Umbriel and Noctalia as favorites",
				"Made the layout adapt to wide and portrait screens; Devlog follows Social and fills the available width",
				"Aligned Project cards in a responsive grid, with Open above likes and dislikes; removed tag chips",
				"Added four animated accent circles to the hero",
			],
		},
		{
			id: "v033-supabase",
			date: "2026-10-13",
			title: "v0.3.3 — Supabase backend",
			category: "Website",
			kind: "major",
			description: "The site got a real backend: reactions and telemetry now live in Postgres instead of the browser.",
			changes: [
				"Likes and dislikes became global — every visitor sees the same counts, stored in Supabase",
				"Telemetry moved from GoatCounter to the same Supabase project; /telemetry loads stats without a token",
				"Nixwebring left the page: it is a status-bar button that opens Previous, Ring, Random and Next",
				"Six new themes: One Dark, Monokai, Synthwave '84, Palenight, GitHub Dark and Rosé Pine Dawn",
				"Explore Projects and Devlog hero buttons got a context menu",
			],
		},
		{
			id: "v031-hero-devlog",
			date: "2026-10-11",
			title: "v0.3.1 — hero, devlog and deep links",
			category: "Website",
			kind: "major",
			description: "The site got a proper front page, a changelog and shareable URLs.",
			changes: [
				"Replaced the site header with a glowing hero: logo, title, Explore Projects and Devlog actions",
				"Added this devlog — a changelog timeline built from the repository history, opened as a popup",
				"URLs now mirror the workspace: /main/, /projects/, /design/terminal, with deep links handed over by 404.html",
				"Every UI icon migrated from PNG to crisp Material Symbols SVG",
			],
		},
		{
			id: "v030-desktop",
			date: "2026-10-10",
			title: "v0.3.0 — the desktop rebuild",
			category: "Website",
			kind: "major",
			description: "The single-file site became a small window manager built out of modules.",
			changes: [
				"Split the monolith into core, layout, menus, modals, projects, settings, statusbar, terminal and workspaces modules",
				"Added Main, Projects and Design workspaces, switchable from the status bar or with Ctrl+1…3",
				"Sections can be tiled or floated, dragged, reordered and resized",
				"Status-bar menu with settings, help, reload and exit; version labels come from the VERSION file",
			],
		},
		{
			id: "terminal",
			date: "2026-10-10",
			title: "Terminal in the browser",
			category: "Experiments",
			kind: "minor",
			description: "dimux-term 1.0 — a small command-line simulator living inside the page. Open it with Ctrl+`.",
			changes: [
				"Commands: help, fastfetch, projects, open, workspace, theme, socials, ls, echo and friends",
				"The window can be dragged by its bar and resized from the corner",
				"`sudo` answers honestly: this is a browser tab, not a root shell",
			],
		},
		{
			id: "project-explorer",
			date: "2026-10-10",
			title: "Repositories explorer",
			category: "Projects",
			kind: "minor",
			description: "The Projects workspace now lists the public GitHub repositories in a searchable grid.",
			changes: [
				"Search, category filters and sorting by name or category",
				"Optional live stats from the GitHub API, cached for the session",
				"Cards link to the repo and, when one exists, to the homepage",
			],
		},
		{
			id: "nixwebring",
			date: "2026-10-10",
			title: "Nix Webring",
			category: "Linux",
			kind: "minor",
			description: "The site joined the Nix webring with a small section under the main workspace.",
			changes: [
				"Previous, random and next hops across nixwebr.ing",
				"The webring badge links back to the ring",
			],
		},
		{
			id: "settings",
			date: "2026-10-05",
			title: "Settings dialog",
			category: "Website",
			kind: "minor",
			description: "Appearance and behaviour moved into a proper settings window.",
			changes: [
				"Thirteen colour themes with accent colours, including a custom HEX",
				"Toggles for window effects, compact mode and section controls",
				"About card with the current version and reset actions",
			],
		},
		{
			id: "popup-fixes",
			date: "2026-09-30",
			title: "Popup fixes and smaller buttons",
			category: "Website",
			kind: "minor",
			description: "A maintenance pass right after the first release.",
			changes: [
				"Fixed bugs in the Social and Repos popups",
				"Shrank the buttons a little",
				"README refresh",
			],
		},
		{
			id: "v020",
			date: "2026-09-27",
			title: "v0.2.0 — first good release",
			category: "Website",
			kind: "major",
			description: "The redesigned site got its first tagged release, published automatically.",
			changes: [
				"Tagged v0.2.0",
				"GitHub Actions workflow that reads VERSION, tags and publishes a release on every push to main",
				"Version labels in the help, warning and settings dialogs",
				"Fixed the version display bugs found right after the redesign",
			],
		},
		{
			id: "md3",
			date: "2026-09-26",
			title: "Material Design 3 redesign",
			category: "Website",
			kind: "major",
			description: "Five rounds of redesign brought the whole site to Material Design 3.",
			changes: [
				"Catppuccin-flavoured MD3 tokens: surfaces, outlines, containers and radii",
				"Pill buttons, rounded cards and a new context-menu style",
				"Iterated as MD3 v1…v5 before settling",
			],
		},
		{
			id: "catppuccin-mocha",
			date: "2026-08-10",
			title: "Catppuccin Mocha",
			category: "Website",
			kind: "minor",
			description: "The default palette became Catppuccin Mocha with the blue accent — the look the site still uses.",
			changes: [
				"Switched the colour scheme to Catppuccin Mocha",
				"Set the blue accent (#89b4fa) as the primary colour",
			],
		},
	];

	const state = { category: "all" };
	const refs = {};
	let observer = null;

	function cacheRefs() {
		refs.filters = element("devlog-filters");
		refs.timeline = element("devlog-timeline");
		refs.empty = element("devlog-empty");
		refs.showAll = element("devlog-show-all");
	}

	function formatDate(iso) {
		const [year, month, day] = String(iso).split("-").map(Number);
		if (!year || !month || !day) return iso;
		return `${MONTHS[month - 1]} ${day}, ${year}`;
	}

	function sortedEntries() {
		return [...ENTRIES].sort((a, b) => b.date.localeCompare(a.date));
	}

	function matches(entry) {
		return state.category === "all" || entry.category === state.category;
	}

	function revealNow(entry) {
		entry.classList.add("is-visible");
		observer?.unobserve(entry);
	}

	function watch(entry) {
		if (!observer || !DX.motion.allowed()) {
			revealNow(entry);
			return;
		}
		observer.observe(entry);
	}

	function revealAll() {
		refs.timeline?.querySelectorAll(".devlog-entry").forEach(revealNow);
	}

	function buildChip(label, value) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "project-chip";
		button.textContent = label;
		button.setAttribute("aria-pressed", String(state.category === value));
		button.addEventListener("click", () => {
			state.category = value;
			render();
		});
		return button;
	}

	function renderFilters() {
		if (!refs.filters) return;
		refs.filters.replaceChildren();
		for (const category of ["all", ...CATEGORIES]) {
			refs.filters.append(buildChip(category === "all" ? "All" : category, category));
		}
	}

	function buildEntry(item) {
		const entry = document.createElement("li");
		entry.className = `devlog-entry devlog-entry--${item.kind === "major" ? "major" : "minor"}`;

		const marker = document.createElement("span");
		marker.className = "devlog-entry__marker";
		marker.setAttribute("aria-hidden", "true");
		entry.append(marker);

		const card = document.createElement("article");
		card.className = "devlog-entry__card";

		const head = document.createElement("div");
		head.className = "devlog-entry__head";

		const date = document.createElement("time");
		date.className = "devlog-entry__date";
		date.dateTime = item.date;
		date.textContent = formatDate(item.date);

		const kind = document.createElement("span");
		kind.className = `devlog-entry__kind devlog-entry__kind--${item.kind === "major" ? "major" : "minor"}`;
		kind.textContent = KIND_LABELS[item.kind] || KIND_LABELS.minor;

		const category = document.createElement("span");
		category.className = "devlog-entry__category";
		category.textContent = CATEGORIES.includes(item.category) ? item.category : "Website";

		head.append(date, kind, category);

		const title = document.createElement("h3");
		title.className = "devlog-entry__title";
		title.textContent = item.title;

		const description = document.createElement("p");
		description.className = "devlog-entry__desc";
		description.textContent = item.description;

		card.append(head, title, description);

		if (Array.isArray(item.changes) && item.changes.length) {
			const list = document.createElement("ul");
			list.className = "devlog-entry__changes";
			for (const change of item.changes) {
				const line = document.createElement("li");
				line.textContent = change;
				list.append(line);
			}
			card.append(list);
		}

		entry.append(card);
		return entry;
	}

	function render() {
		if (!refs.timeline) return;
		renderFilters();
		refs.timeline.replaceChildren();
		const list = sortedEntries().filter(matches);
		for (const item of list) {
			const entry = buildEntry(item);
			refs.timeline.append(entry);
			watch(entry);
		}
		if (refs.empty) refs.empty.hidden = list.length > 0;
	}

	function goTo() {
		if (DX.workspaces.activeId() !== "main") DX.workspaces.switchTo("main");
		DX.modals.open("devlog-modal");
	}

	function init() {
		cacheRefs();
		if (!refs.timeline) return;

		if ("IntersectionObserver" in window) {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;
						revealNow(entry.target);
					}
				},
				{ threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
			);
		}

		refs.showAll?.addEventListener("click", () => {
			state.category = "all";
			render();
		});

		const syncMotion = () => {
			if (!DX.motion.allowed()) revealAll();
		};
		DX.events.on("motion-changed", syncMotion);
		DX.events.on("settings-changed", syncMotion);

		render();
	}

	DX.devlog = { init, goTo, entries: () => ENTRIES };
})();

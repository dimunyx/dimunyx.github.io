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

	/* Tagged releases are also pulled from the GitHub API, so a new version shows
	   up here without editing this file. Curated entries always win: if a version
	   is already described above, the generated one is dropped. */
	const REPO = "dimunyx/dimunyx.github.io";
	const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases?per_page=100`;
	const RELEASES_CACHE_KEY = "dimunyx-devlog-releases-v1";
	const RELEASES_CACHE_TTL = 6 * 60 * 60 * 1000;

	/* Every date and change below is taken from the real git history of this
	   repository — nothing here is invented. */
	const ENTRIES = [
		{
			id: "v042-flux-workspace",
			date: "2026-11-25",
			title: "v0.4.2 — Flux workspace and release sync",
			category: "Website",
			kind: "minor",
			description: "Flux gets its own workspace and a Projects card, status-bar button 4 now asks what to open, and the devlog starts syncing tagged GitHub releases on its own.",
			changes: [
				"Added Flux to the Projects explorer under Linux, with a Workspace shortcut on its card",
				"New fourth workspace dedicated to Flux: overview, features, current package support and Nix install commands",
				"Status-bar button 4 opens a small What to open? menu with the Flux overview; Ctrl+4 still switches directly and the URL mirrors it at /flux/",
				"Devlog now pulls tagged GitHub releases automatically, falling back to compare commits when release notes are empty; curated entries take priority",
				"Release data is cached for six hours, so the devlog keeps working when the GitHub API is rate-limited or offline",
				"Help, the terminal workspace list and the status bar now cover four workspaces, with compact switcher buttons on narrow phones",
			],
		},
		{
			id: "v041-direct-webring",
			date: "2026-11-18",
			title: "v0.4.1 — direct webring neighbours",
			category: "Linux",
			kind: "minor",
			description: "A small maintenance release: the webring menu now links straight to the neighbouring sites instead of going through the ring redirects.",
			changes: [
				"Previous now opens ginkogruen.net directly instead of the nixwebr.ing previous redirect",
				"Next now opens teaboi.xyz directly instead of the nixwebr.ing next redirect",
				"Random and the Nix Webring badge still go through nixwebr.ing",
			],
		},
		{
			id: "v040-site-sparks",
			date: "2026-11-17",
			title: "v0.4.0 — site-wide sparks and Abyssal",
			category: "Website",
			kind: "major",
			description: "The hero click effect is now everywhere: every click and tap across the site throws the same spark burst. This release also brings the reworked hero, visible close buttons on every theme, the Abyssal palette and a full phone pass.",
			changes: [
				"The spark burst from the hero now fires on every click and tap across the site, dialogs included",
				"Hero orbs follow the pointer with spring physics, get shoved by clicks and ripple when poked",
				"Hero clicks throw a 9-spark burst from the pointer; touch taps work too",
				"All click effects back off when reduced or disabled motion is enabled",
				"Workspace buttons keep their pill, but the digit no longer sits on its own keycap",
				"Modal close buttons stay visible on every theme; light themes invert the white SVG icons",
				"The development warning popup now has the same round close cross as the other dialogs",
				"The Catppuccin Mocha Deep Blue palette is now called Abyssal",
				"Phone pass: safe-area spacing, larger touch targets, single-column project cards and tighter modals",
			],
		},
		{
			id: "v037-hero-glow",
			date: "2026-11-14",
			title: "v0.3.7 — interactive hero and Deep Blue palette",
			category: "Website",
			kind: "minor",
			description: "The hero's glowing orbs now react to the pointer, a new Catppuccin Mocha Deep Blue palette joins the theme list, and Using now reflects the current Arch Linux setup.",
			changes: [
				"Hero glow orbs lean away from the pointer with layered parallax and brighten on hover",
				"Clicking the hero sends a light ripple through the nearest orb; touch taps work too",
				"The effects back off when reduced or disabled motion is enabled",
				"Added the Catppuccin Mocha Deep Blue palette from the Noctalia setup",
				"Using now switched from NixOS to Arch Linux and now shows the current hardware, kernel and packages",
			],
		},
		{
			id: "v036-help-update",
			date: "2026-10-31",
			title: "v0.3.6 — Help update",
			category: "Website",
			kind: "minor",
			description: "Updated the site help to match the current available features.",
			changes: [
				"Removed the outdated telemetry dashboard shortcut from the Help instructions",
			],
		},
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
	let autoEntries = [];

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

	function versionOf(entry) {
		const fromId = String(entry?.id || "").match(/^auto-v(\d+\.\d+\.\d+)$/);
		if (fromId) return fromId[1];
		const match = String(entry?.title || "").match(/v(\d+\.\d+\.\d+)/);
		return match ? match[1] : null;
	}

	function curatedVersions() {
		const versions = new Set();
		for (const entry of ENTRIES) {
			const version = versionOf(entry);
			if (version) versions.add(version);
		}
		return versions;
	}

	function stripReleaseNoise(line) {
		return String(line)
			.replace(/\s+by @[\w-]+(?:\s+in\s+https?:\/\/\S+)?\s*$/i, "")
			.replace(/\s*\(#\d+\)\s*$/, "")
			.replace(/^[a-z]+(?:\([^)]*\))?!?:\s+/, "")
			.trim()
			.replace(/^[a-z]/, (char) => char.toUpperCase());
	}

	function changesFromBody(body) {
		const changes = [];
		let inChanges = false;
		for (const raw of String(body || "").split(/\r?\n/)) {
			const line = raw.trim();
			if (/^#{1,6}\s/.test(line)) {
				inChanges = /what'?s changed/i.test(line);
				continue;
			}
			if (!inChanges) continue;
			const match = line.match(/^[*-]\s+(.+)$/);
			if (!match) continue;
			const change = stripReleaseNoise(match[1]);
			if (!change || /^version\(/i.test(change) || /^merge\b/i.test(change)) continue;
			changes.push(change);
		}
		return changes;
	}

	function entryFromRelease(release) {
		const tag = String(release?.tag_name || "").replace(/^v/i, "").trim();
		if (!/^\d+\.\d+\.\d+$/.test(tag)) return null;

		const changes = changesFromBody(release.body);
		const [major, minor] = tag.split(".").map(Number);
		const summary = changes[0] ? changes[0].slice(0, 72) : "GitHub release";
		const releaseName = String(release.name || "").trim();
		let titled = `v${tag} — ${summary}`;
		if (releaseName && releaseName !== tag && releaseName !== `v${tag}`) {
			const cleaned = releaseName.replace(/^v?\d+\.\d+\.\d+\s*[—:-]?\s*/, "").trim();
			if (cleaned) titled = `v${tag} — ${cleaned}`;
		}

		return {
			id: `auto-v${tag}`,
			date: String(release.published_at || release.created_at || "").slice(0, 10),
			title: titled,
			category: "Website",
			kind: major === 0 && minor === 0 ? "major" : "minor",
			description: changes.length
				? "Synced from the GitHub release notes. A curated entry takes priority whenever both exist for the same version."
				: "Synced from a GitHub release that was published without generated notes.",
			changes,
		};
	}

	function compareHead(release) {
		const match = String(release?.body || "").match(/\/compare\/([^\s)]+)/i);
		return match ? match[1] : null;
	}

	function commitsFromCompare(data) {
		if (!Array.isArray(data?.commits)) return [];
		const changes = [];
		for (const commit of data.commits) {
			const subject = stripReleaseNoise(String(commit?.commit?.message || "").split("\n")[0]);
			if (!subject || /^version\(/i.test(subject) || /^merge\b/i.test(subject)) continue;
			changes.push(subject);
		}
		return changes;
	}

	function loadCompareChanges(release, entry) {
		const head = compareHead(release);
		if (!head) return Promise.resolve(false);
		const url = `https://api.github.com/repos/${REPO}/compare/${head}`;
		return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
			.then((response) => {
				if (!response.ok) throw new Error(`GitHub compare answered ${response.status}`);
				return response.json();
			})
			.then((data) => {
				const changes = commitsFromCompare(data);
				if (!changes.length) return false;
				entry.changes = changes.slice(0, 12);
				entry.description = "Synced from the commits between releases on GitHub. A curated entry takes priority whenever both exist for the same version.";
				if (entry.title.endsWith("— GitHub release")) {
					entry.title = entry.title.replace(/— GitHub release$/, `— ${changes[0].slice(0, 72)}`);
				}
				return true;
			})
			.catch((error) => {
				console.warn("[dimunyx] devlog compare skipped", error);
				return false;
			});
	}

	function readReleasesCache() {
		try {
			const raw = window.localStorage.getItem(RELEASES_CACHE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed || !Array.isArray(parsed.releases)) return null;
			if (Date.now() - Number(parsed.savedAt) > RELEASES_CACHE_TTL) return null;
			return parsed.releases;
		} catch (error) {
			return null;
		}
	}

	function writeReleasesCache(releases) {
		try {
			window.localStorage.setItem(RELEASES_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), releases }));
		} catch (error) {
			/* Storage can be unavailable or full; the devlog still works without it. */
		}
	}

	function useReleases(releases) {
		const curated = curatedVersions();
		const pairs = releases
			.map((release) => ({ release, entry: entryFromRelease(release) }))
			.filter((pair) => pair.entry && !curated.has(versionOf(pair.entry)));
		autoEntries = pairs.map((pair) => pair.entry);
		render();

		const pending = pairs
			.filter((pair) => !pair.entry.changes.length && compareHead(pair.release))
			.map((pair) => loadCompareChanges(pair.release, pair.entry));
		if (!pending.length) return;
		Promise.all(pending).then((updated) => {
			if (updated.some(Boolean)) render();
		});
	}

	function loadReleases() {
		const cached = readReleasesCache();
		if (cached) {
			useReleases(cached);
			return;
		}
		if (typeof fetch !== "function") return;

		fetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" }, cache: "no-cache" })
			.then((response) => {
				if (!response.ok) throw new Error(`GitHub API answered ${response.status}`);
				return response.json();
			})
			.then((releases) => {
				if (!Array.isArray(releases)) return;
				writeReleasesCache(releases);
				useReleases(releases);
			})
			.catch((error) => {
				console.warn("[dimunyx] devlog releases skipped", error);
			});
	}

	function mergedEntries() {
		const curated = curatedVersions();
		const generated = autoEntries.filter((entry) => {
			const version = versionOf(entry);
			return version && !curated.has(version);
		});
		return [...ENTRIES, ...generated];
	}

	function sortedEntries() {
		return mergedEntries().sort((a, b) => b.date.localeCompare(a.date));
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
		loadReleases();
	}

	DX.devlog = { init, goTo, entries: () => sortedEntries() };
})();

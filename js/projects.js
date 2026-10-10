/* Project explorer: central data, search / filter / sort, optional GitHub stats. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	/* Static facts taken from the public GitHub API. Nothing here is invented:
	   names, URLs, descriptions and languages were read from the repos themselves. */
	const PROJECTS = [
		{
			id: "dimunyx.github.io",
			name: "dimunyx.github.io",
			url: "https://github.com/dimunyx/dimunyx.github.io",
			homepage: "https://dimunyx.github.io/",
			description: "My personal portfolio repository.",
			category: "Web",
			languages: ["JavaScript", "CSS", "HTML"],
			license: null,
		},
		{
			id: "dimfetch",
			name: "dimfetch",
			url: "https://github.com/dimunyx/dimfetch",
			homepage: null,
			description: "A minimalistic fetch made by dimunyx",
			category: "Tools",
			languages: ["C++", "Makefile", "Shell"],
			license: "MIT",
		},
		{
			id: "NixOS-dotfiles",
			name: "NixOS-dotfiles",
			url: "https://github.com/dimunyx/NixOS-dotfiles",
			homepage: null,
			description: "Repo for saving my NixOS system & configuration files :)",
			category: "NixOS",
			languages: ["GLSL", "Shell", "CSS"],
			license: null,
		},
		{
			id: "NixOS-configuration",
			name: "NixOS-configuration",
			url: "https://github.com/dimunyx/NixOS-configuration",
			homepage: null,
			description: 'Saving "/etc/nixos"!',
			category: "NixOS",
			languages: ["Nix"],
			license: null,
		},
		{
			id: "dimunyx-nvim",
			name: "dimunyx-nvim",
			url: "https://github.com/dimunyx/dimunyx-nvim",
			homepage: null,
			description: "My neovim configuration",
			category: "Config",
			languages: ["Lua"],
			license: null,
		},
		{
			id: "wall-archive",
			name: "wall-archive",
			url: "https://github.com/vimlinuz/wall-archive",
			homepage: "https://vimlinuz.github.io/wall-archive/",
			description: "A curated archive of wallpapers which features a wide variety of styles and resolutions to suit every taste.",
			category: "Contribute",
			languages: ["Nix"],
			license: null,
		},
		{
			id: "umbriel",
			name: "umbriel",
			url: "https://github.com/noctalia-dev/umbriel",
			homepage: "https://noctalia.dev/",
			description: "An independent compositor with scrolling, dwindle and master layouts, blur, shadows, and fluid animations.",
			category: "Contribute",
			languages: ["C++"],
			license: "MIT",
		},
		{
			id: "nixwebr.ing",
			name: "nixwebr.ing",
			url: "https://github.com/imnotpoz/nixwebr.ing",
			homepage: "https://nixwebr.ing",
			description: "the nix webring",
			category: "Contribute",
			languages: [],
			license: null,
		},
	];

	/* Short display labels for language chips. Search still matches the full names. */
	const LANGUAGE_LABELS = {
		JavaScript: "JS",
		Makefile: "Mkfile",
		Shell: "Sh",
		TypeScript: "TS",
		Python: "Py",
	};

	const LIVE_CACHE_KEY = "dimunyx-repo-stats-v1";
	const LIVE_CACHE_TTL = 10 * 60 * 1000;

	const state = {
		query: "",
		category: "all",
		sort: "name-asc",
		live: null,
		liveError: null,
	};

	const refs = {};

	function cacheRefs() {
		refs.grid = element("project-grid");
		refs.empty = element("project-empty");
		refs.status = element("project-status");
		refs.search = element("project-search");
		refs.sort = element("project-sort");
		refs.sortUpdated = element("project-sort-updated");
		refs.filters = element("project-filters");
		refs.clear = element("project-clear-filters");
	}

	function liveEntry(name) {
		return state.live?.get(name) || null;
	}

	function matches(project) {
		if (state.category !== "all" && project.category !== state.category) return false;
		const query = state.query.trim().toLowerCase();
		if (!query) return true;
		const haystack = [project.name, project.description, project.category, project.license || "", ...project.languages]
			.join(" ")
			.toLowerCase();
		return haystack.includes(query);
	}

	function sorted(list) {
		const copy = [...list];
		switch (state.sort) {
			case "name-desc":
				return copy.sort((a, b) => b.name.localeCompare(a.name));
			case "category":
				return copy.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
			case "updated": {
				const key = (project) => liveEntry(project.name)?.pushed_at || "";
				return copy.sort((a, b) => key(b).localeCompare(key(a)) || a.name.localeCompare(b.name));
			}
			default:
				return copy.sort((a, b) => a.name.localeCompare(b.name));
		}
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
		const categories = ["all", ...new Set(PROJECTS.map((project) => project.category))];
		refs.filters.replaceChildren();
		for (const category of categories) {
			refs.filters.append(buildChip(category === "all" ? "All" : category, category));
		}
	}

	function buildCard(project) {
		const card = document.createElement("article");
		card.className = "project-card";

		const head = document.createElement("div");
		head.className = "project-card__head";
		const title = document.createElement("h3");
		title.className = "project-card__name";
		title.textContent = project.name;
		const badge = document.createElement("span");
		badge.className = "project-card__badge";
		badge.textContent = project.category;
		head.append(title, badge);

		const description = document.createElement("p");
		description.className = "project-card__desc";
		description.textContent = project.description;

		const tags = document.createElement("ul");
		tags.className = "project-card__tags";
		for (const language of project.languages) {
			const tag = document.createElement("li");
			tag.textContent = LANGUAGE_LABELS[language] || language;
			tags.append(tag);
		}

		card.append(head, description, tags);

		const live = liveEntry(project.name);
		const meta = document.createElement("p");
		meta.className = "project-card__meta";
		const facts = [];
		if (project.license) facts.push(project.license);
		if (live) {
			if (typeof live.stargazers_count === "number") facts.push(`★ ${live.stargazers_count}`);
			if (typeof live.forks_count === "number") facts.push(`⑂ ${live.forks_count}`);
			if (typeof live.pushed_at === "string") {
				const date = new Date(live.pushed_at);
				if (!Number.isNaN(date.getTime())) facts.push(`updated ${date.toLocaleDateString()}`);
			}
			if (live.archived) facts.push("archived");
		}
		if (facts.length) {
			meta.textContent = facts.join(" · ");
			card.append(meta);
		}

		const actions = document.createElement("div");
		actions.className = "project-card__actions";

		const repoLink = document.createElement("a");
		repoLink.href = project.url;
		repoLink.target = "_blank";
		repoLink.rel = "noopener noreferrer";
		repoLink.textContent = "GitHub";

		const openLink = document.createElement("a");
		openLink.href = project.homepage || project.url;
		openLink.target = "_blank";
		openLink.rel = "noopener noreferrer";
		openLink.textContent = project.homepage ? "Open ↗" : "Open repo ↗";

		actions.append(repoLink, openLink);
		card.append(actions);
		return card;
	}

	function renderStatus() {
		if (!refs.status) return;
		if (state.liveError) {
			refs.status.hidden = false;
			refs.status.textContent = `Live GitHub stats unavailable (${state.liveError}). Everything else still works.`;
			return;
		}
		if (state.live) {
			refs.status.hidden = false;
			refs.status.textContent = "Live stats from the GitHub API.";
			return;
		}
		refs.status.hidden = true;
		refs.status.textContent = "";
	}

	function render() {
		if (!refs.grid) return;
		renderFilters();
		if (refs.sortUpdated) refs.sortUpdated.hidden = !state.live;
		if (state.sort === "updated" && !state.live) state.sort = "name-asc";
		if (refs.sort) {
			refs.sort.value = state.sort;
			DX.select.refresh(refs.sort);
		}

		const list = sorted(PROJECTS.filter(matches));
		refs.grid.replaceChildren();
		for (const project of list) refs.grid.append(buildCard(project));
		refs.empty.hidden = list.length > 0;
		renderStatus();
	}

	function readLiveCache() {
		try {
			const raw = sessionStorage.getItem(LIVE_CACHE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed.at !== "number" || Date.now() - parsed.at > LIVE_CACHE_TTL) return null;
			if (!parsed.repos || !Array.isArray(parsed.repos)) return null;
			return parsed.repos;
		} catch (error) {
			return null;
		}
	}

	function writeLiveCache(repos) {
		try {
			sessionStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({ at: Date.now(), repos }));
		} catch (error) {
			/* storage may be blocked; the explorer works without it */
		}
	}

	function applyLive(repos) {
		const map = new Map();
		for (const repo of repos) {
			if (!repo || typeof repo.name !== "string") continue;
			map.set(repo.name, repo);
		}
		state.live = map;
		state.liveError = null;
	}

	async function loadLiveStats() {
		const cached = readLiveCache();
		if (cached) {
			applyLive(cached);
			render();
			return;
		}
		try {
			const response = await fetch("https://api.github.com/users/dimunyx/repos?per_page=100", {
				headers: { Accept: "application/vnd.github+json" },
			});
			if (!response.ok) {
				throw new Error(response.status === 403 ? "rate limited" : `HTTP ${response.status}`);
			}
			const repos = await response.json();
			if (!Array.isArray(repos) || !repos.length) throw new Error("empty response");
			writeLiveCache(repos);
			applyLive(repos);
		} catch (error) {
			state.live = null;
			state.liveError = error?.message || "network error";
		}
		render();
	}

	function init() {
		cacheRefs();
		if (!refs.grid) return;

		refs.search.addEventListener("input", () => {
			state.query = refs.search.value;
			render();
		});
		refs.search.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && refs.search.value) {
				event.stopPropagation();
				refs.search.value = "";
				state.query = "";
				render();
			}
		});
		refs.sort.addEventListener("change", () => {
			state.sort = refs.sort.value;
			render();
		});
		refs.clear.addEventListener("click", () => {
			state.query = "";
			state.category = "all";
			refs.search.value = "";
			render();
			refs.search.focus();
		});

		render();
		loadLiveStats();
	}

	DX.projects = { init, list: () => PROJECTS, render };
})();

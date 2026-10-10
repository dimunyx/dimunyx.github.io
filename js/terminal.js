/* Interactive terminal: a browser-side simulator, never a real shell. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	const refs = {};
	const history = [];
	let historyIndex = -1;
	let draft = "";

	const LOGO = [
    "Hi, Welcome to dimunyx's terminal!",
	];

	function scrollToEnd() {
		if (refs.screen) refs.screen.scrollTop = refs.screen.scrollHeight;
	}

	function print(text, className) {
		if (!refs.output) return;
		for (const line of String(text).split("\n")) {
			const node = document.createElement("div");
			node.className = className ? `term-line ${className}` : "term-line";
			node.textContent = line;
			refs.output.append(node);
		}
		scrollToEnd();
	}

	function printBlock(lines, className) {
		print(lines.join("\n"), className);
		refs.output?.append(document.createElement("div"));
	}

	function printLink(label, href, className) {
		if (!refs.output) return;
		const line = document.createElement("div");
		line.className = className ? `term-line ${className}` : "term-line";
		const link = document.createElement("a");
		link.href = href;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = label;
		line.append(link);
		refs.output.append(line);
		scrollToEnd();
	}

	function platformLabel() {
		const data = navigator.userAgentData;
		if (data && typeof data.platform === "string" && data.platform) return data.platform;
		return navigator.platform || "unknown";
	}

	function currentWorkspaceLabel() {
		const id = DX.workspaces.activeId();
		return DX.workspaces.label(id);
	}

	function currentThemeLabel() {
		return DX.THEME_LABELS[DX.settings.get().theme] || DX.settings.get().theme;
	}

	const COMMANDS = new Map();

	function command(name, description, handler) {
		COMMANDS.set(name, { description, handler });
	}

	command("help", "list available commands", () => {
		const lines = ["Available commands:", ""];
		for (const [name, entry] of COMMANDS) lines.push(`  ${name.padEnd(12)} ${entry.description}`);
		printBlock(lines);
	});

	command("clear", "clear the screen", () => {
		refs.output?.replaceChildren();
	});

	command("fastfetch", "system info about this site", () => {
		printBlock(LOGO, "term-line--ascii term-line--accent");
		const info = [
			"dimunyx@site",
			"-----------",
			"OS: dimunyx.github.io (browser sandbox)",
			`Host: ${platformLabel()}`,
			`Kernel: ${navigator.userAgent}`,
			"Shell: dimux-term 1.0 (simulated)",
			"WM: tiled / floating sections",
			`Theme: ${currentThemeLabel()}`,
			`Workspace: ${currentWorkspaceLabel()}`,
			`Resolution: ${window.innerWidth}x${window.innerHeight}`,
			`Language: ${navigator.language}`,
			"CPU: not available in a browser",
			"Memory: not available in a browser",
		];
		printBlock(info);
	});

	command("neofetch", "alias of fastfetch", () => {
		printBlock(LOGO, "term-line--ascii term-line--accent");
		COMMANDS.get("fastfetch").handler([]);
	});

	command("projects", "list repositories", () => {
		print("Public repositories:");
		for (const project of DX.projects.list()) {
			printLink(`  ${project.name} — ${project.description}`, project.url);
		}
		print("");
		print("Type `open <name>` to open one, or `workspace projects` to switch.", "term-line--muted");
	});

	command("open", "open a project page (open <name>)", (args) => {
		const needle = args.join(" ").toLowerCase();
		if (!needle) {
			print("Usage: open <project-name>", "term-line--error");
			return;
		}
		const project = DX.projects.list().find((item) => item.name.toLowerCase() === needle || item.id.toLowerCase() === needle);
		if (!project) {
			print(`No project named "${args.join(" ")}".`, "term-line--error");
			return;
		}
		window.open(project.homepage || project.url, "_blank", "noopener,noreferrer");
		print(`Opening ${project.name}…`, "term-line--accent");
	});

	command("about", "who runs this site", () => {
		printBlock([
			"dimunyx",
			"-------",
			"Linux user and C++ enthusiast.",
			"Using Linux since mid-July 2025.",
			"I'm 14 years old, turning 15 soon, and passionate about programming.",
		]);
	});

	command("socials", "links to social accounts", () => {
		const links = [
			["GitHub", "https://github.com/dimunyx"],
			["Tiktok", "https://www.tiktok.com/@dimunyx"],
			["YouTube", "https://www.youtube.com/@dimunyx"],
			["Twitch", "https://www.twitch.tv/dimunyx1"],
		];
		for (const [label, href] of links) printLink(`  ${label}`, href);
		print("");
		print("  Telegram — open it from the Social section (QR code).", "term-line--muted");
	});

	command("workspaces", "list workspaces", () => {
		const activeId = DX.workspaces.activeId();
		print("Workspaces:");
		for (const workspace of DX.workspaces.list()) {
			const marker = workspace.id === activeId ? "*" : " ";
			print(`  ${marker} ${workspace.id.padEnd(11)} ${workspace.sections.length} sections`);
		}
		print("");
		print("Switch with `workspace <id>` or Ctrl+1…3.", "term-line--muted");
	});

	command("workspace", "switch workspace (workspace <id>)", (args) => {
		const id = (args[0] || "").toLowerCase();
		if (!id) {
			COMMANDS.get("workspaces").handler([]);
			return;
		}
		const target = DX.workspaces.list().find((workspace) => workspace.id === id);
		if (!target) {
			print(`Unknown workspace "${id}".`, "term-line--error");
			return;
		}
		DX.workspaces.switchTo(target.id);
		print(`Switched to ${target.label}.`, "term-line--accent");
	});

	command("ws", "alias of workspace", (args) => COMMANDS.get("workspace").handler(args));

	command("theme", "switch colour theme (theme <mocha|macchiato|frappe|latte>)", (args) => {
		const id = (args[0] || "").toLowerCase();
		if (!id) {
			print(`Current theme: ${currentThemeLabel()}`);
			print(`Themes: ${DX.THEME_ORDER.join(", ")}`, "term-line--muted");
			return;
		}
		if (!DX.THEME_ORDER.includes(id)) {
			print(`Unknown theme "${id}". Try: ${DX.THEME_ORDER.join(", ")}`, "term-line--error");
			return;
		}
		DX.settings.set("theme", id);
		print(`Theme set to ${DX.THEME_LABELS[id]}.`, "term-line--accent");
	});

	command("date", "current date and time", () => {
		print(new Date().toString());
	});

	command("echo", "print the given text", (args) => {
		print(args.join(" "));
	});

	command("whoami", "the current user", () => {
		print("dimunyx");
	});

	command("uname", "kernel-ish info", () => {
		print(`dimux-term ${navigator.platform || "web"} (browser sandbox)`);
	});

	command("sudo", "not available here", () => {
		print("nobody is home. This is a browser tab, not a root shell.", "term-line--error");
	});

	command("ls", "sections in the active workspace", () => {
		const id = DX.workspaces.activeId();
		const workspace = DX.workspaces.list().find((item) => item.id === id);
		print(workspace.sections.join("  "));
	});

	command("exit", "close the terminal", () => {
		DX.terminal.close();
	});

	function run(raw) {
		const trimmed = raw.trim();
		print(`dimunyx@site:~$ ${trimmed}`, "term-line--accent");
		if (!trimmed) return;
		history.push(trimmed);
		historyIndex = -1;
		draft = "";
		const [name, ...args] = trimmed.split(/\s+/);
		const entry = COMMANDS.get(name.toLowerCase());
		if (!entry) {
			print(`dimux-term: command not found: ${name}`, "term-line--error");
			print("Type `help` to see what works here.", "term-line--muted");
			return;
		}
		try {
			entry.handler(args);
		} catch (error) {
			console.error("[dimunyx] terminal command failed", error);
			print("That command failed to run.", "term-line--error");
		}
	}

	function moveHistory(delta) {
		if (!history.length) return;
		if (historyIndex === -1) {
			if (delta > 0) {
				draft = refs.input.value;
				historyIndex = history.length - 1;
				refs.input.value = history[historyIndex];
			}
			return;
		}
		const next = historyIndex + delta;
		if (next < 0) {
			historyIndex = -1;
			refs.input.value = draft;
			return;
		}
		if (next >= history.length) return;
		historyIndex = next;
		refs.input.value = history[historyIndex];
	}

	function open() {
		DX.modals.open("terminal-modal", { returnFocus: document.activeElement, focusSelector: "#terminal-input" });
		resetDrag();
		if (!refs.output?.children.length) {
			printBlock(LOGO, "term-line--ascii term-line--accent");
			print("dimux-term 1.0 — a small simulator living inside this page.");
			print("Type `help` for commands. This is not a real shell.", "term-line--muted");
			print("");
		}
		window.setTimeout(() => refs.input.focus(), 0);
	}

	function close() {
		resetDrag();
		DX.modals.close("terminal-modal");
	}

	/* ------------------------------------------------------------------ *
	 * Drag the window by its title bar
	 * ------------------------------------------------------------------ */

	let dragPointerId = null;
	let dragOffsetX = 0;
	let dragOffsetY = 0;

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function onDragStart(event) {
		if (event.button !== 0 || event.target.closest(".terminal__close")) return;
		const dialog = refs.modal.querySelector(".terminal-modal__dialog");
		if (!dialog) return;
		event.preventDefault();
		const rect = dialog.getBoundingClientRect();
		dragPointerId = event.pointerId;
		dragOffsetX = event.clientX - rect.left;
		dragOffsetY = event.clientY - rect.top;
		/* Switch from grid-centred to absolute viewport coordinates. */
		dialog.style.position = "fixed";
		dialog.style.left = `${rect.left}px`;
		dialog.style.top = `${rect.top}px`;
		dialog.style.margin = "0";
		dialog.classList.add("is-dragging");
		event.currentTarget.setPointerCapture?.(event.pointerId);
	}

	function onDragMove(event) {
		if (dragPointerId !== event.pointerId) return;
		const dialog = refs.modal.querySelector(".terminal-modal__dialog");
		if (!dialog) return;
		const rect = dialog.getBoundingClientRect();
		dialog.style.left = `${clamp(event.clientX - dragOffsetX, 0, Math.max(0, window.innerWidth - rect.width))}px`;
		dialog.style.top = `${clamp(event.clientY - dragOffsetY, 0, Math.max(0, window.innerHeight - rect.height))}px`;
	}

	function onDragEnd(event) {
		if (dragPointerId !== event.pointerId) return;
		dragPointerId = null;
		const dialog = refs.modal.querySelector(".terminal-modal__dialog");
		dialog?.classList.remove("is-dragging");
		event.currentTarget.releasePointerCapture?.(event.pointerId);
	}

	function resetDrag() {
		const dialog = refs.modal?.querySelector(".terminal-modal__dialog");
		if (!dialog) return;
		dialog.style.position = "";
		dialog.style.left = "";
		dialog.style.top = "";
		dialog.style.margin = "";
		dialog.style.width = "";
		dialog.style.height = "";
		dialog.classList.remove("is-dragging");
		dragPointerId = null;
		resizePointerId = null;
	}

	/* ------------------------------------------------------------------ *
	 * Resize the window from the bottom-right corner
	 * ------------------------------------------------------------------ */

	let resizePointerId = null;
	let resizeStartX = 0;
	let resizeStartY = 0;
	let resizeStartWidth = 0;
	let resizeStartHeight = 0;

	function onResizeStart(event) {
		if (event.button !== 0) return;
		const dialog = refs.modal.querySelector(".terminal-modal__dialog");
		if (!dialog) return;
		event.preventDefault();
		const rect = dialog.getBoundingClientRect();
		resizePointerId = event.pointerId;
		resizeStartX = event.clientX;
		resizeStartY = event.clientY;
		resizeStartWidth = rect.width;
		resizeStartHeight = rect.height;
		/* Anchor the top-left corner so only the bottom-right moves. */
		dialog.style.position = "fixed";
		dialog.style.left = `${rect.left}px`;
		dialog.style.top = `${rect.top}px`;
		dialog.style.margin = "0";
		dialog.style.width = `${rect.width}px`;
		dialog.style.height = `${rect.height}px`;
		dialog.classList.add("is-dragging");
		event.currentTarget.setPointerCapture?.(event.pointerId);
	}

	function onResizeMove(event) {
		if (resizePointerId !== event.pointerId) return;
		const dialog = refs.modal.querySelector(".terminal-modal__dialog");
		if (!dialog) return;
		const width = clamp(resizeStartWidth + event.clientX - resizeStartX, 320, window.innerWidth - 16);
		const height = clamp(resizeStartHeight + event.clientY - resizeStartY, 200, window.innerHeight * 0.9);
		dialog.style.width = `${width}px`;
		dialog.style.height = `${height}px`;
	}

	function onResizeEnd(event) {
		if (resizePointerId !== event.pointerId) return;
		resizePointerId = null;
		const dialog = refs.modal.querySelector(".terminal-modal__dialog");
		dialog?.classList.remove("is-dragging");
		event.currentTarget.releasePointerCapture?.(event.pointerId);
	}

	function toggle() {
		if (DX.modals.isOpen("terminal-modal")) close();
		else open();
	}

	function init() {
		refs.modal = element("terminal-modal");
		refs.screen = element("terminal-screen");
		refs.output = element("terminal-output");
		refs.form = element("terminal-form");
		refs.input = element("terminal-input");
		if (!refs.modal || !refs.screen || !refs.output || !refs.form || !refs.input) return;

		refs.form.addEventListener("submit", (event) => {
			event.preventDefault();
			const value = refs.input.value;
			refs.input.value = "";
			run(value);
		});

		refs.input.addEventListener("keydown", (event) => {
			if (event.key === "ArrowUp") {
				event.preventDefault();
				moveHistory(-1);
			} else if (event.key === "ArrowDown") {
				event.preventDefault();
				moveHistory(1);
			} else if (event.key === "Escape" && refs.input.value) {
				event.stopPropagation();
				refs.input.value = "";
			}
		});

		refs.modal.querySelector(".terminal__close")?.addEventListener("click", close);
		element("status-terminal")?.addEventListener("click", open);

		const bar = element("terminal-bar");
		bar?.addEventListener("pointerdown", onDragStart);
		bar?.addEventListener("pointermove", onDragMove);
		bar?.addEventListener("pointerup", onDragEnd);
		bar?.addEventListener("pointercancel", onDragEnd);

		const resize = element("terminal-resize");
		resize?.addEventListener("pointerdown", onResizeStart);
		resize?.addEventListener("pointermove", onResizeMove);
		resize?.addEventListener("pointerup", onResizeEnd);
		resize?.addEventListener("pointercancel", onResizeEnd);

		window.addEventListener("resize", resetDrag);

		document.addEventListener("keydown", (event) => {
			if (event.defaultPrevented || event.altKey || event.metaKey || !event.ctrlKey) return;
			if (event.key !== "`" && event.key !== "~") return;
			if (DX.util.isEditableTarget(event.target) && !DX.modals.isOpen("terminal-modal")) return;
			event.preventDefault();
			toggle();
		});
	}

	DX.terminal = { init, open, close, toggle, run };
})();

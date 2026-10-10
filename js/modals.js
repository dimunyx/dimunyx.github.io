/* Modal wiring: every trigger, every close button, one shared manager. */
(function () {
	"use strict";

	const DX = window.DX;
	const { element } = DX.util;

	/* [trigger selector, modal id] */
	const TRIGGERS = [
		["#help-site", "help-modal"],
		[".about-main-trigger", "about-modal"],
		[".using-now-trigger", "using-now-modal"],
		[".interests-trigger", "interests-modal"],
		[".experience-trigger", "experience-modal"],
		[".social-trigger", "social-modal"],
		["#site-info-menu-item", "site-info-modal"],
	];

	function wireCloseButtons() {
		document.querySelectorAll(".telegram-modal").forEach((modal) => {
			modal.querySelectorAll(".telegram-modal__close, .warning-modal__close").forEach((button) => {
				button.addEventListener("click", () => DX.modals.close(modal));
			});
		});
	}

	function wireTriggers() {
		for (const [selector, modalId] of TRIGGERS) {
			document.querySelectorAll(selector).forEach((trigger) => {
				trigger.addEventListener("click", () => {
					const options = { returnFocus: trigger };
					if (modalId === "terminal-modal") DX.terminal.open();
					else DX.modals.open(modalId, options);
				});
			});
		}
	}

	function wireTelegram() {
		const socialModal = element("social-modal");
		document.querySelectorAll(".telegram-trigger").forEach((trigger) => {
			trigger.addEventListener("click", () => {
				const socialOpen = socialModal && !socialModal.hidden;
				if (socialOpen) DX.modals.close(socialModal, { restoreFocus: false });
				DX.modals.open("telegram-modal", { returnFocus: socialOpen ? trigger : trigger });
			});
		});
	}

	function openTestWarning() {
		DX.modals.open("test-warning-modal", { restoreFocus: false });
	}

	function init() {
		wireCloseButtons();
		wireTriggers();
		wireTelegram();
		openTestWarning();
	}

	DX.initModals = init;
})();

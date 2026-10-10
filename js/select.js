/* Native <select> popups are used directly (browser's own dropdown UI).
   DX.select keeps no-op init/refresh/refreshAll so settings.js and
   projects.js can call refresh without caring whether selects are upgraded. */
(function () {
	"use strict";

	const DX = window.DX;

	function init() {}
	function refresh() {}
	function refreshAll() {}

	DX.select = { init, refresh, refreshAll };
})();

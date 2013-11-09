function init() {
	// add some flare to the demo by adding a background splash
	flickr('thymus vulgaris', 'body');
	// initialize bootstrap components
	initScrollSpy('.scroll-spy');
	initToolTips('[class*="app-tooltip"]');
}
function initScrollSpy(cssSelector) {
	$(cssSelector).each(function() {
		$(this).scrollspy('refresh');
	});
}
function initToolTips(cssSelector) {
	$(cssSelector).each(function () {
		var $t = $(this);
		var p = $t.hasClass('app-tooltip-top') ? 'top' : $t
				.hasClass('app-tooltip-right') ? 'right' : $t
				.hasClass('app-tooltip-left') ? 'left' : $t
				.hasClass('app-tooltip-bottom') ? 'bottom' : 'auto';
		$t.tooltip({
		     delay: { show: 100 },
		     animation: false,
		     placement: p
		});
	});
}
function flickr(key, sel) {
	$.getJSON(
		'http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?',
		{
			tags : key,
			tagmode : 'any',
			format : 'json'
		}, function(data) {
			var ri = data.items[Math.floor(Math.random() * data.items.length)];
			var url = ri.media.m.replace(/_[a-zA-Z]+\./, '_b.');
			$(sel).css('background-image', 'url(' + url + ')');
		});
}
//# sourceURL=app.js
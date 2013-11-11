function init() {
	// add some flare to the demo by adding a background splash
	flickr('thymus vulgaris', 'body');
	// initialize bootstrap components
	initScrollSpy('.scroll-spy');
	initTipsPops('app-tooltip');
	initTipsPops('app-popover');
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
function initTipsPops(clzp) {
	var isp = clzp.indexOf('popover') > -1;
	$('[class*="' + clzp + '"]').each(function () {
		var $t = $(this);
		var p = $t.hasClass(clzp + '-top') ? 'top' : $t
				.hasClass(clzp + '-right') ? 'right' : $t
				.hasClass(clzp + '-left') ? 'left' : $t
				.hasClass(clzp + '-bottom') ? 'bottom' : 'auto';
		if (isp) {
			$t.popover({
			     animation: false,
			     placement: p
			});
		} else {
			$t.tooltip({
			     delay: { show: 100 },
			     animation: false,
			     placement: p
			});
		}
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
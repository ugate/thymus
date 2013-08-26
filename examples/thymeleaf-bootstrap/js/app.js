function init() {
	// initialize bootstrap scroll spy (if needed)
	//var navHeight = $('.navbar').outerHeight(true) + 10;
	$('[data-spy="scroll"]').each(function() {
		$(this).scrollspy('refresh');
	});
	// add some flare to the demo by adding a background splash
	flickr('scenic', 'body');
	var $l = $('.app-loading-label');
	$l.html('(Loaded)');
	setTimeout(function() {
		$l.html(' ');
	}, 5000);
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
//@ sourceURL=app.js
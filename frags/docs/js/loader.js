// Example listener usage and minimal progress bar for visual queue for fragment loading
var $lt = null, $pt = null, $pi = null, loaded = false;
function fragListener(event) {
	// var $source = $(this);
	if (event.type != 'load') {
		if (event.type == 'beforeload'
				&& event.fragUrl.indexOf('frags/cancel') >= 0) {
			// example that shows how to prevent a fragment from showing
			event.preventDefault();
		}
	} else {
		event.log();
	}
	// loading indicator
	$lt = $lt ? $lt : $('#loadThymus');
	if (!loaded && event.fragCount == event.fragCurrTotal) {
		$lt = $('#fragProgress');
		$pt = $('.frag-prog');
		$pi = $lt.find('.progress-bar');
	}
	var p = Math.round((event.fragCount / event.fragCurrTotal) * 100) + '%';
	$pt = $pt ? $pt : $lt.find('#loadThymusText');
	$pt.text(p);
	if (loaded) {
		$lt.attr('aria-valuenow', p);
	}
	$pi = $pi ? $pi : $('#loadThymusProgPer');
	$pi.css('width', p);
}
function fragsListener(event) {
	loaded = true;
	event.log();
	if (event.scope.prop('tagName').toLowerCase() !== 'html') {
		return;
	}
	$('#loadThymus').css('display', 'none');
	$('#fragTotal').text(event.fragCount);
	init(event);
}
function handleReadme() {
	var h = this.handle;
	var d = '';
	var ps = h.data.match(/<p[^>]*>((.|[\r\n])+)<\/p>/img);
	if (ps) {
		$.each(ps, function(i, p) {
			d += p;
		});
	}
	var $d = $(d);
	h.process($d);
}
// Documentation/Demos site specific loading
var $lt = null, $pt = null, $pi = null, loaded = false;

/**
 * Listener for individual fragment events that will update visual progression
 * indicators
 * 
 * @param event
 *            the fragment event
 */
function fragListener(event) {
	// var $source = $(this);
	var isl = event.type != 'load';
	var isb = isl || event.type != 'beforehttp';
	if (!isl && !isb) {
		return;
	}
	if (isl) {
		if (isb && event.pathSiphon.indexOf('frags/cancel') >= 0) {
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

/**
 * Listener for batch fragment events that will update visual progression
 * 
 * @param event
 *            the batch fragment event
 */
function fragsListener(event) {
	if (event.type != 'load') {
		return;
	}
	var firstLoad = !loaded;
	loaded = true;
	event.log();
	if ($pt) {
		$pt.html($pt.html() + ' of ' + event.fragCount + ' frags &amp; '
				+ (event.fragAdjustments ? event.fragAdjustments.length : 0)
				+ ' adjustments @ ' + (event.loadTime / 1000) + ' sec');
	}
	if (event.actionScope.prop('tagName').toLowerCase() !== 'html') {
		updateUI(event);
		return;
	}
	$('#loadThymus').css('display', 'none');
	$('#fragTotal').text(event.fragCount);
	initUI(event.errors, firstLoad);
}

/**
 * Example that shows how to use a <b>result siphon</b> handler. Takes the read
 * me mark down and captures any paragraph tags via a regular expression and
 * passes the result on to the handler's process method which will use the
 * passed content to update the DOM. NOTE: used a regular expression instead of
 * JQuery selector due non-HTML content type for mark-down
 */
function handleReadme() {
	var h = this.handle;
	if (h.fragSrc.error) {
		throw h.fragSrc.error;
	}
	var d = '';
	var ps = h.data.match(/<p[^>]*>((.|[\r\n])+)<\/p>/img);
	if (ps) {
		$.each(ps, function(i, p) {
			d += p;
		});
	}
	var $d = $(d);
	h.proceed($d);
}

//# sourceURL=loader.js

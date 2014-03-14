  * Release v1.0.0-beta.4 [skip saucelabs-qunit]
  * Release v1.0.0-beta.4
  * Release v1.0.0-beta.4 [skip saucelabs-qunit]
  * Release v1.0.0-beta.4[skip saucelabs-qunit] [skip ci]
  * Release v1.0.0-beta.4 [skip saucelabs-qunit]
  * Release v1.0.0-beta.4
  * Release v1.0.0-beta.4 [skip saucelabs-qunit]
  * Release v1.0.0-beta.4
  * Release v1.0.0-beta.4 [skip ci]
  * Release v1.0.0-beta.4
  * Initial release site
  * Initial dist
  * Separated JS sources using inclusion versus raw concatenation to avoid JS prefixes/suffixes. Also, permits pre-build inclusion.
  * Changed logo
  * Changed logo [ci skip]
  * #10 released document handle reference when waiting for IE ready state within a separate window to avoid IE permission denied error
  * Added CI quint sub-task to test task
  * Fixed #11 added check for array before calling replacement function apply/call
  * #11 added check for array before calling replacement function apply/call [ci skip]
  * Fixed #10 use periodic check for "ready" state instead of "submit" event
  * Fixed #8 by recapturing window instance after location changes Fixed #9 by using periodic "ready" state vs "unload" (same logic that IE uses)
  * Initial CI build [ci skip]
  * Initial CI build
  * Update .travis.yml
  * Initial CI build
  * Update .travis.yml
  * Initial CI build
  * Added sauce_browsers.yml
  * Create .travis.yml
  * Test harness fix for full page navigations where the server doesn't support the HTTP method
  * Expanded default warning only HTTP status code range for test harness
  * Fixed #7 by changing replaceWith with a detach version that performs removal only after the final fragments event is dispatched. Updated documentation pertaining to issue. Corrected issues in test harness that rely on this functionality. Added progress bar/indicator to test harness.
  * Introduced delegate for issue #6
  * Cleaned up test harness. Added progress bar
  * Corrected fragment after DOM event timing. Updated site link to thymusjs.org
  * Update CNAME
  * Create CNAME
  * Added additional self-destination tests
  * Added test validation for HTTP parameters
  * Added full page navigation test case with parameter validation
  * Fragment events for navigation actions in different windows will now wait to fire until the target window has finished loading (provided the window is in the same domain)
  * Minor tweaks for working with other windows and detached nodes.
  * Started action/search/dest scope when working with detached nodes (not complete). Started test suite using qunit.
  * Corrected inconsistent fragment event types. JQuery will omit the event type namespace when triggered from a JQuery element with a valid selector, but will leave the namespace intact for raw elements. Added sourceEvent to fragment events (for reference). Added missing eventSiphon from fragment events.
  * Fixed a few issues surrounding nested fragment loading. Added fragAdjustment property to frag events. Doc updates.
  * Docs update
  * Fixed multiple frags load events from being fired when completion is checked more than once
  * Updated path siphon use of "this" for binding simulation
  * Updated docs for data-thx-context-path to data-thx-base-path
  * Spelling/grammar corrections.
  * Spelling correction.
  * Video demo update
  * Updated siphon resolvers to ignore siphon resolver characters within single or double quotes. Added video example to docs.
  * Fixed parameter names for parameter siphons
  * Agent demo uses radios instead of buttons
  * Result directives
  * Added frags listener cancel for beforehttp events
  * Fixed node resolver text directive for buttons (was previously using jQuery.val)
  * Added support for directives within surrogate siphon resolvers that contain an event siphon event and a corresponding siphon attribute (resulted in fixed "Fragment" button in agents demo)
  * Updated doc example to handle multiple fragments. Started support for agents within surrogate siphon resolvers.
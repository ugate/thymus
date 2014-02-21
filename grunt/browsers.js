// Docs: https://saucelabs.com/docs/platforms/webdriver
// Windows: Opera 15+ not currently supported by Sauce Labs
// Mac: Opera not currently supported by Sauce Labs
// Android: Chrome not currently supported by Sauce Labs
// iOS: Chrome not currently supported by Sauce Labs

// Windows Current
var winVer = "Windows 8.1";
var winIEVer = "11";
var winFFVer = "27";
var winChromeVer = "32";

// Windows Legacy
var winLeg1Ver = "Windows 8";
var winLeg1IEVer = "10";
var winLeg2Ver = "Windows 7";
var winLeg2IEVer = "9";

// Apple
var osxVer = "OS X 10.9";
var osxFFVer = "26";
var osxChromeVer = "31";
var osxSafariVer = "7";

// Android
var androidVer = "4.3";

// Linux
var linuxFFVer = "27";
var linuxChromeVer = "32";

// All platforms/browsers to be tested
browsers = [ {
	"browserName" : "safari",
	"version" : osxSafariVer,
	"platform" : osxVer
}, {
	"browserName" : "googlechrome",
	"version" : osxChromeVer,
	"platform" : osxVer
}, {
	"browserName" : "firefox",
	"version" : osxFFVer,
	"platform" : osxVer
}, {
	"browserName" : "iphone",
	"version" : osxSafariVer,
	"platform" : osxVer
}, {
	"browserName" : "internet explorer",
	"version" : winIEVer,
	"platform" : winVer
}, {
	"browserName" : "internet explorer",
	"version" : winLeg1IEVer,
	"platform" : winLeg1Ver
}, {
	"browserName" : "internet explorer",
	"version" : winLeg2IEVer,
	"platform" : winLeg2Ver
}, {
	"browserName" : "googlechrome",
	"version" : winChromeVer,
	"platform" : winVer
}, {
	"browserName" : "firefox",
	"version" : winFFVer,
	"platform" : winVer
}, {
	"browserName" : "googlechrome",
	"version" : linuxChromeVer,
	"platform" : "Linux"
}, {
	"browserName" : "firefox",
	"version" : linuxFFVer,
	"platform" : "Linux"
}, {
	"browserName" : "android",
	"version" : androidVer,
	"platform" : "Linux"
} ];
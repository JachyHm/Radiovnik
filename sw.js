let cacheName = "radiovnik-v3";
let siteUrl = "simp.jachyhm.cz";
let filesToCache = [
	"/",
	"/data.json",
	"/favicon.ico",
	"/manifest.webmanifest",
	"/assets/css/bootstrap.min.css",
	"/assets/css/hierarchy-select.min.css",
	"/assets/css/solid.min.css",
	"/assets/css/style.css",
	"/assets/icons/favicon-128x128.png",
	"/assets/icons/favicon-144x144.png",
	"/assets/icons/favicon-152x152.png",
	"/assets/icons/favicon-192x192.png",
	"/assets/icons/favicon-384x384.png",
	"/assets/icons/favicon-512x512.png",
	"/assets/icons/favicon-72x72.png",
	"/assets/icons/favicon-96x96.png",
	"/assets/webfonts/fa-solid-900.eot",
	"/assets/webfonts/fa-solid-900.svg",
	"/assets/webfonts/fa-solid-900.ttf",
	"/assets/webfonts/fa-solid-900.woff",
	"/assets/webfonts/fa-solid-900.woff2",
	"/js/bootstrap.bundle.min.js",
	"/js/descriptors.js",
	"/js/hierarchy-select.min.js",
	"/js/jquery-3.6.0.min.js",
	"/js/main.js",
	"/js/stationRow.js",
];

self.addEventListener("install", function(e) {
	e.waitUntil(
		caches.open(cacheName).then(function(cache) {
			return cache.addAll(filesToCache)
		})
	)
})

self.addEventListener("fetch", function(e) {
	var url = new URL(e.request.url);
	var host = url.hostname;
	var fileURI = url.pathname;
	const cleanURL = `${url.protocol}//${url.host}${url.pathname}`;
	if (filesToCache.includes(fileURI) && host == siteUrl) {
		e.respondWith(
			caches.open(cacheName).then(function(cache) {
				return fetch(e.request).then((response) => {
					if (response.status < 400) {
						cache.put(cleanURL, response.clone());
					} else {
						cache.delete(cleanURL);
					}
					console.log(`Returning online version of ${cleanURL}`);
					return response;
				},
				() => {
					console.log(`Returning cached version of ${cleanURL}`);
					return cache.match(cleanURL);
				});
			})
		)
	} else {
		console.log(`Fallback to default behaviour for ${cleanURL}`);
	}
})

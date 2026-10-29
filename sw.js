const CACHE_NAME = "radiovnik-v20261029-1";
const SITE_URL = "simp.jachyhm.cz";
const FILES_TO_CACHE = [
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

AbortSignal.timeout ??= function timeout(ms) {
	const ctrl = new AbortController()
	setTimeout(() => ctrl.abort(), ms)
	return ctrl.signal
}

self.addEventListener("install", function(e) {
	e.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(FILES_TO_CACHE)
		})
	)
})

self.addEventListener("fetch", function(e) {
	var url = new URL(e.request.url);
	var host = url.hostname;
	var fileURI = url.pathname;
	const cleanURL = `${url.protocol}//${url.host}${url.pathname}`;

	if (host == SITE_URL && e.request.method == "GET" && FILES_TO_CACHE.includes(fileURI)) {
		e.respondWith(
			caches.open(CACHE_NAME).then(async cache => {
				try {
					const response = await fetch(e.request, { signal: AbortSignal.timeout(5000) });
					if (response.status < 400) {
						cache.put(cleanURL, response.clone());
					} else if (response.status < 500) {
						cache.delete(cleanURL);
					} else {
						throw new Error(`${response.status}${response.statusText ? " " + response.statusText : ""}`);
					}
					console.log(`Returning online version of ${cleanURL}`);
					return response;
				} catch (err) {
					return await cache.match(cleanURL).then(cachedResponse => {
						if (cachedResponse !== undefined) {
							console.log(`Fetch failed with "${err}"\r\nReturning cached version of ${cleanURL}`);
							return cachedResponse;
						} else {
							cache.delete(cleanURL);
							console.log(`No cached version for ${cleanURL}, fallback to default behaviour`);
							return fetch(e.request);
						}
					});
				}
			})
		)
	} else {
		console.log(`Fallback to default behaviour for ${cleanURL}`);
	}
});

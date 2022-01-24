let cacheName = "radiovnik-v3"
let siteUrl = "https://simp.jachyhm.cz"
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
]

self.addEventListener("install", function(e) {
	e.waitUntil(
		caches.open(cacheName).then(function(cache) {
			return cache.addAll(filesToCache)
		})
	)
})

self.addEventListener("fetch", function(e) {
	var url = e.request.url;
	//console.log('Handling fetch event for', url);
	var fileURI = url.substring(siteUrl.length).toLowerCase();
	if (filesToCache.includes(fileURI) && url[8] === 's' && url[9] === 'i' && url[10] === 'm' && url[11] === 'p' &&
		url[12] === '.' && url[13] === 'j' && url[14] === 'a' && url[15] === 'c' && url[16] === 'h' && url[17] === 'y' && 
		url[18] === 'h' && url[19] === 'm' && url[20] === '.' && url[21] === 'c' && url[22] === 'z'
	) {
		//console.log(`${fileURI} is file which should be cached, proceeding.`);
		e.respondWith(
			caches.open(cacheName).then(function(cache) {
				return fetch(e.request.clone()).then((response) => {
					//console.log(` Managed to fetch online version with status ${response.status}:`, response);
					if (response.status < 400) {
						//console.log(` Caching request since it resulted with status ${response.status}`, e.request);
						cache.put(e.request, response.clone());
					} else {
						//console.log(` Deleting request from cache since it resulted with status ${response.status}`, e.request);
						cache.delete(e.request);
					}
					return response;
				},
				() => {
					//console.log(` Unable to fetch online version, returning cached.`);
					return cache.match(e.request);
				});
			})
		)
	} else {
		//console.log(`${fileURI} isn't file which should be cached, fallback to default behaviour.`);
	}
})

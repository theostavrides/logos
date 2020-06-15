const nav = document.querySelector('nav')

nav.addEventListener('click', e => {
	if(e.target && e.target.id === 'dashboard-link') {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
	}
})


const utils = { 
	objectIsEmpty: (obj) => { Object.keys(obj).length === 0 && obj.constructor === Object; } 
}

class ChromeStorageWrapper {
  set(key, value) {
    return new Promise(function(resolve, reject){
      chrome.storage.sync.set({[key]: value}, function() {
        if (chrome.runtime.lastError) { 
          reject(chrome.runtime.lastError); 
        } else {
          resolve({[key]: value});
        }
      });
    });
  }

  get(key, value) {
    return new Promise(function(resolve, reject){
      chrome.storage.sync.get([key], function(result) {
        if (chrome.runtime.lastError) { 
          reject(chrome.runtime.lastError) 
        } else {
          utils.objectIsEmpty(result) ? resolve(null) : resolve(result[key]);
        }
      });
    });
  }

  getAll() {
    return new Promise(function(resolve, reject){
      chrome.storage.sync.get(null, function(result) {
        if (chrome.runtime.lastError) { 
          reject(chrome.runtime.lastError) 
        } else {
          utils.objectIsEmpty(result) ? resolve(null) : resolve(result);
        }
      });
    });
  }
}

class Dashboard {
	constructor(){
		this.init()
	}

	async init(){
		this.storage = new ChromeStorageWrapper();
		this.data = await this.storage.getAll();
		this.articlesContainer = document.querySelector('#articles-container')
		this.initPageTiles(this.data)
	}

	initPageTiles(data){
		Object.entries(data)
			.sort((a,b) => b[1].lastUpdated - a[1].lastUpdated)
			.forEach(entry => this.createPageTile(entry))
	}

	createPageTile([url, data]){
		const { title, translations } = data;

		const template = document.querySelector('#article-template');
		const tile = template.content.cloneNode(true);
		
		const renderHeader = ({ tile, url, title }) => {
			const titleElement = tile.querySelector('.title');
			const heading = titleElement.querySelector('h3');
			const favicon = titleElement.querySelector('img');

			const headingTextNode = document.createTextNode(title); 
			heading.appendChild(headingTextNode);

			titleElement.href = url;
			titleElement.title = title;

			favicon.src = `https://s2.googleusercontent.com/s2/favicons?domain=${url}`;			
		}

		const renderTanslationRows = (tile, translations) => {
			const trananslationsContainer = tile.querySelector('.translations-container')

			translations.forEach(({ selectionText, translation }) => {
				const row = document.createElement('div')
				row.classList.add('row')

				const selectionElement = document.createElement('p');
				const selectionTextNode = document.createTextNode(selectionText); 
				selectionElement.appendChild(selectionTextNode);

				const translationElement = document.createElement('p');
				const translationTextNode = document.createTextNode(translation); 
				translationElement.appendChild(translationTextNode);

				row.appendChild(selectionElement);
				row.appendChild(translationElement)

				trananslationsContainer.appendChild(row)
			})
		}



		renderHeader({ tile, url, title });
		renderTanslationRows(tile, translations);


		this.articlesContainer.appendChild(tile);
	}
}

const dashboard = new Dashboard();
// 


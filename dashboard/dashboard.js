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
		this.pageTileContainer = document.querySelector('#page-tile-container')
		this.initPageTiles(this.data)
	}

	initPageTiles(data){
		Object.entries(data).reverse().forEach(([url, selectionArray]) => { 
			this.createPageTile({ url, selectionArray })
		})
	}

	createPageTile({ url, selectionArray }){
		const template = document.querySelector('#page-tile-template');
		const pageTile = template.content.cloneNode(true);
		
		const renderTitle = (tile) => {
			const title = tile.querySelector('.title');
			const heading = title.querySelector('h3');
			const favicon = title.querySelector('img');

			title.href = url;
			favicon.src = `https://s2.googleusercontent.com/s2/favicons?domain=${url}`			
		}

		const renderTanslationRows = (tile) => {
			const trananslationsContainer = tile.querySelector('.translations-container')

			selectionArray.forEach(({ selectionText, translation }) => {
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



		renderTitle(pageTile);
		renderTanslationRows(pageTile);


		this.pageTileContainer.appendChild(pageTile);
	}
}

const dashboard = new Dashboard();
// 


const logosContentInit = () => {
  // ----------------------- UTILS -----------------------------

  const objectIsEmpty = obj => Object.keys(obj).length === 0 && obj.constructor === Object;

  // -------------------- CHROME STORAGE -----------------------

  class ChromeStorageWrapper {
    set(key, value) {
      return new Promise(function(resolve, reject){
        chrome.storage.sync.set({[key]: value}, function() {
          if (chrome.runtime.lastError) { 
            reject(chrome.runtime.lastError) 
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
            objectIsEmpty(result) ? resolve(null) : resolve(result[key]);
          }
        });
      });
    }
  }

  // ------------------------- RANGY ----------------------------

  class RangyWrapper {
    constructor() {
      rangy.init();

      this.highlighter = rangy.createHighlighter();

      this._addHighlighterClass('yellow')

      this.highlighter.addClassApplier(rangy.createClassApplier("rangy-highlight", {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"]
      }));    
    }

    _addHighlighterClass(color){
      const s = document.createElement('style');
      const css = `.rangy-highlight { background-color: ${color} }`
      s.setAttribute('type', 'text/css');

      if ('textContent' in s) {
        s.textContent = css;
      } else {
        s.styleSheet.cssText = css;
      }

      document.getElementsByTagName('head')[0].appendChild(s);
    }

    getSelectionText(){
      return rangy.getSelection().toString();
    }

    highlightSelection() {
      this.highlighter.highlightSelection("rangy-highlight");
    }

    serializeSelection(){
      var selObj = rangy.getSelection();
      return rangy.serializeSelection(selObj, true)
    }

    deserializeSelection(serializedSelection){
      return rangy.deserializeSelection(serializedSelection);
    }
  }

  // ------------------------- LOGOS ---------------------------

  class Logos {
    constructor(chromeStorageWrapper, rangyWrapper) {
      this.storage = chromeStorageWrapper;
      this.rangy = rangyWrapper;
      this._init();
    }

    async _saveSelection(serializedSelection){
      const url = window.location.href;

      const pageData = await this.storage.get(url);
      
      let newPageData;

      pageData ? newPageData = { ...pageData, [serializedSelection]: {translation: ''} } : 
        newPageData = { [serializedSelection]: { translation: ''} };
      
      return this.storage.set(url, newPageData)
    }

    async _init(){
      const url = window.location.href;

      const pageData = await this.storage.get(url);

      if (pageData) {
        Object.keys(pageData).forEach(key => {
          this.rangy.deserializeSelection(key);
          this.rangy.highlightSelection();
        })
      }
    }

    highlight(){
      const serializedSelection = this.rangy.serializeSelection();
      this.rangy.highlightSelection();
      return this._saveSelection(serializedSelection)
    }
  }

  // ----------------------- MESSAGES --------------------------

  const createMsgHandler = (logos) => {
    return (message, sender, sendResponse) => { 
      const { action } = message;
      switch(action){
        case 'highlight':
          logos.highlight().catch(console.error)
          break;
        case 'translate':
          break;
        default:
          return
      }
    }
  }

  const chromeStorageWrapper = new ChromeStorageWrapper();
  const rangyWrapper = new RangyWrapper();
  const logos = new Logos(chromeStorageWrapper, rangyWrapper); 
  const msgHandler = createMsgHandler(logos);

  chrome.runtime.onMessage.addListener(msgHandler);
}

logosContentInit();

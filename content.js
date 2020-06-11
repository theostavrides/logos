const logosContentInit = () => {

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
      return rangy.serializeSelection();
    }
  }

  // -------------------- CHROME STORAGE -----------------------

  async function storageSet(key, value) {
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

  async function storageGet(key, value) {
    return new Promise(function(resolve, reject){
      chrome.storage.sync.get([key], function(result) {
        resolve(result);
      });
    });
  }

  // ----------------------- MESSAGES --------------------------

  const createMsgHandler = (rw) => {
    return (message, sender, sendResponse) => { 
      const { action } = message;
      switch(action){
        case 'highlight':
          rw.highlightSelection();
          const selection = rw.serializeSelection();
          break;
        case 'translate':
          break;
        default:
          return
      }
    }
  }

  const rangyWrapper = new RangyWrapper();
  const msgHandler = createMsgHandler(rangyWrapper);
  chrome.runtime.onMessage.addListener(msgHandler);

}

logosContentInit();

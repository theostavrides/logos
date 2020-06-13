const logosContentInit = () => {
  // ----------------------- UTILS -----------------------------
  const utils = {
    objectIsEmpty: (obj) => { Object.keys(obj).length === 0 && obj.constructor === Object; },

    clearSelection: () => {
      if (window.getSelection) { window.getSelection().removeAllRanges() }
      else if (document.selection) { document.selection.empty() }
    }   
  }


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
            utils.objectIsEmpty(result) ? resolve(null) : resolve(result[key]);
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

      this.highlighter.addClassApplier(rangy.createClassApplier("logos-highlight", {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"]
      }));
    }

    _addHighlighterClass(color){
      const s = document.createElement('style');
      const css = `.logos-highlight { background-color: ${color} }`
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
      this.highlighter.highlightSelection("logos-highlight");
    }

    addDataAttributeToSelectedElements(name, value){
      var selectedElements = rangy.getSelection().getRangeAt(0).getNodes([1]);
      const highlighted = selectedElements.forEach(el => {
        if (!el.classList.contains('logos-highlight')) return
        el.setAttribute(name, value);
      })
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

    _init(){
      this._loadTranslationsAndHighlights();
      this._initTranslationPopup();
    }

    async _loadTranslationsAndHighlights(){
      const url = window.location.href;

      const pageData = await this.storage.get(url);

      if (pageData) {
        pageData.forEach(selectionEntry => {
          this.rangy.deserializeSelection(selectionEntry.serializedSelection);
          this.rangy.highlightSelection();
        })
      }

      utils.clearSelection();
    }

    _initTranslationPopup(){
      const html = `
        <div class="logos-container">
          <h5 class="logos-title">λ</h5>
          <textarea 
            class="logos-translation-input" 
            placeholder="Enter a custom translation..."
            rows="3"
          ></textarea>
          <button type="button" class="logos-translation-submit-button">Save</button>
        </div>
      `;

      const css = `
        body, html {
          padding: 0;
          margin: 0;
          overflow: hidden;
        }

        #logos-translation-popup {
          display: block;
          background-color: slategray;
          font-family: monospace;
          border-color: gray;
        }

        #logos-translation-popup .logos-container {
          display: grid;
          grid-template-columns: 1fr;
        }

        #logos-translation-popup .logos-title {
          font-size: 12px;
          line-height: 16px;
          color: white;
          margin: 0;
          padding: 0 4px;
          padding-top: 1px;
          text-align: left;
        }

        #logos-translation-popup .logos-translation-input {
          border-bottom: none;
          border-color: inherit;
        }

        #logos-translation-popup .logos-translation-submit-button {
        }

      `;

      const popup = document.createElement('div');
      popup.id = 'logos-translation-popup';
      popup.innerHTML = html

      const style = document.createElement('style');
      style.innerHTML = css;

      const ifrm = document.createElement('iframe')
      ifrm.id = 'logos-translation-popup';
      ifrm.style.position = 'absolute';
      ifrm.style.top = '0';
      ifrm.style.padding = '0';
      ifrm.style.zIndex = '16777271';
    
      document.body.appendChild(ifrm)

      var doc = ifrm.contentWindow.document;

      doc.head.appendChild(style);
      doc.body.appendChild(popup);

      ifrm.height = `${popup.offsetHeight}px`;

      function handleTextAreaResize() {
        let resizing = false

        const resizeObserver = new ResizeObserver(entries => {
          for (const entry of entries) {
            if (entry.contentBoxSize) {
              // TODO: handle edgecase for entry.contentBoxSize
            } else {
              if (resizing === false) {
                resizing = true;
                ifrm.width  = `${entry.contentRect.width + 4}px`;
                ifrm.height = `${popup.offsetHeight + 4}px`;
                setTimeout(() => resizing = false, 20)
              }
              
            }
          }
        });

        resizeObserver.observe(textarea);        
      }

      const textarea = doc.querySelector('.logos-translation-input');
      handleTextAreaResize(textarea)

      
    }

    async _saveSelection(serializedSelection, selectionText, translation){
      const url = window.location.href;
      const pageEntryArray = await this.storage.get(url);
      const newPageEntry = { serializedSelection, selectionText, translation }
      let newPageEntryArray;

      pageEntryArray ? 
        newPageEntryArray = [ ...pageEntryArray, newPageEntry ] : 
        newPageEntryArray = [ newPageEntry ];
      
      return this.storage.set(url, newPageEntryArray)
    }

    highlight(){
      const selectionText = this.rangy.getSelectionText()
      const serializedSelection = this.rangy.serializeSelection();
      this.rangy.highlightSelection();
      this.rangy.addDataAttributeToSelectedElements('data-logos-highlight', '');
      return this._saveSelection(serializedSelection, selectionText, '')
    }

    translate(){
      const selectionText = this.rangy.getSelectionText()
      const serializedSelection = this.rangy.serializeSelection();
      this.rangy.highlightSelection();
      this.rangy.addDataAttributeToSelectedElements('data-logos-translation', translation);
      return this._saveSelection(serializedSelection, selectionText, translation)
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
          logos.translate().catch(console.error)
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

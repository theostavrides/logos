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

  // -------------------- TRANSLATION POPUP -------------------- 

  class TranslationPopup {
    constructor(){
      const popupElement = this.createPopupElement()
      const styleElement = this.createPopupStyleElement();
      const iframeElement = this.createPopupIframe();

      this.popup = this.initIframe(iframeElement, popupElement, styleElement)
      this.attachTextAreaResizeHandler(iframeElement, popupElement)
    }

    createPopupElement(){
      const closeIconUrl = chrome.runtime.getURL("icons/close.svg");

      const popupElement = document.createElement('div');
  
      popupElement.id = 'popup';
    
      const html = `
        <div class="grid">
          <header>
            <h5 class="logo">λ</h5>
            <img class="close-icon" src="${closeIconUrl}"/>
          </header>

          <textarea 
            class="translation-textarea" 
            placeholder="Enter a translation..."
            rows="3"
          ></textarea>
          <button type="button" class="save-button">save</button>
        </div>
      `;

      popupElement.innerHTML = html;

      return popupElement
    }

    createPopupStyleElement(){
      const style = document.createElement('style');
      
      style.innerHTML = `
        body, html {
          padding: 0;
          margin: 0;
          overflow: hidden;
        }

        #popup {
          display: block;
          background: rgb(86,104,120);
          background: linear-gradient(90deg, rgba(86,104,120,0.969625350140056) 0%, rgba(142,168,174,0.9556197478991597) 50%, rgba(187,179,227,0.969625350140056) 100%);
          font-family: monospace;
          border: 2px solid #a3a3a3;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr;
        }

        header {
          display: flex;
          justify-content: space-between;
          cursor: grab;
        }

        .logo {
          width: 10px;
          font-size: 14px;
          line-height: 20px;
          color: white;
          margin: 0;
          padding: 0 4px;
          padding-top: 1px;
          text-align: left;
        }

        .close-icon {
          height: 11px;
          width: 11px;
          padding: 5px;
          opacity: 0.35;
          cursor: pointer;
        }

        .close-icon:hover {
          opacity: 0.6;
        }

        .translation-textarea {
          -webkit-transition: all 0.30s ease-in-out;
          -moz-transition: all 0.30s ease-in-out;
          -ms-transition: all 0.30s ease-in-out;
          -o-transition: all 0.30s ease-in-out;
          border: none;
          outline: none;
        }

        textarea:focus::-webkit-input-placeholder { color:transparent; }
        textarea:focus:-moz-placeholder { color:transparent; }
        textarea:focus::-moz-placeholder { color:transparent; }
        textarea:focus:-ms-input-placeholder { color:transparent; }

        .translation-textarea:focus {
          box-shadow: 0 0 3px rgba(54, 9, 235, 0.42)
        }

        .save-button {
          border: none;
          border-top: 1px solid grey;
          font-family: monospace;
          line-height: 20px;
        }

      `;

      return style;
    }

    createPopupIframe(){
      const iframe = document.createElement('iframe')

      iframe.id = 'logos-translation-popup';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.padding = '0';
      iframe.style.zIndex = '16777271';
      iframe.style.border = '0';
      // iframe.style.display = 'none'

      return iframe;
    }

    attachTextAreaResizeHandler(iframe, popupHtmlElement){
      const textarea = this.popup.querySelector('.translation-textarea');
        
      let resizing = false

      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.contentBoxSize) {
            // TODO: handle edgecase for entry.contentBoxSize
          } else {
            if (resizing === false) {
              resizing = true;
              iframe.width  = `${entry.contentRect.width + 6}px`;
              iframe.height = `${popupHtmlElement.offsetHeight + 6}px`;
              setTimeout(() => resizing = false, 1)
            }
            
          }
        }
      });

      resizeObserver.observe(textarea);              
    }

    initIframe(iframeElement, popupElement, styleElement){
      document.body.appendChild(iframeElement)

      const iframeDoc = iframeElement.contentWindow.document;
      iframeDoc.head.appendChild(styleElement);
      iframeDoc.body.appendChild(popupElement);

      iframeElement.height = `${popupElement.offsetHeight}px`;

      return iframeDoc;

    }
  }

  // ------------------------- LOGOS ---------------------------

  class Logos {
    constructor(chromeStorageWrapper, rangyWrapper) {
      this.storage = chromeStorageWrapper;
      this.rangy = rangyWrapper;

      this._loadTranslationsAndHighlights();
      this.translationPopup = new TranslationPopup
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

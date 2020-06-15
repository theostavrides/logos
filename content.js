const logosContentInit = () => {

  // ----------------------- UTILS -----------------------------

  const utils = {
    objectIsEmpty: (obj) => { Object.keys(obj).length === 0 && obj.constructor === Object; },

    clearSelection: () => {
      if (window.getSelection) { window.getSelection().removeAllRanges(); }
      else if (document.selection) { document.selection.empty(); }
    },   

    getCleanUrl: () => `${location.protocol}//${location.host}${location.pathname}`,

  }


  // -------------------- CHROME STORAGE -----------------------

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
  }

  // ------------------------- RANGY ---------------------------

  class RangyWrapper {

    /* 
      ### Public Methods ###
      1. getSelectionText
      2. highlightSelection
      3. addDataAttributeToSelectedElements
      4. serializeSelection
      5. deserializeSelection
      6. getSelectionEndPosition
    */

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

      const css = `
        .logos-highlight { 
          background-color: ${color};
          position: relative; 
        }
      `;

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
      const selectedElements = rangy.getSelection().getRangeAt(0).getNodes([1]);
      const highlighted = selectedElements.forEach(el => {
        if (!el.classList.contains('logos-highlight')) return;
        el.setAttribute(name, value);
      })
    }

    serializeSelection(){
      const selObj = rangy.getSelection();
      return rangy.serializeSelection(selObj, true);
    }

    deserializeSelection(serializedSelection){
      return rangy.deserializeSelection(serializedSelection);
    }

    getSelectionEndPosition(){
      return rangy.getSelection().getEndClientPos();
    }
  }

  // -------------------- TRANSLATION POPUP -------------------- 

  class TranslationPopup {

    /* 
      ### Public Methods ###
      1. registerSaveTranslationHandler
      2. open
      3. close
      4. save
    */

    constructor(){
      this.popupElement = this._createPopupElement();
      this.styleElement = this._createPopupStyleElement();
      this.iframeElement = this._createPopupIframe();
      
      this.popup = this._initIframe();
      this.textarea = this.popupElement.querySelector('.translation-textarea');
      
      this._attachTextAreaResizeObserver();
      this._attachClickListener();

      this.saveTranslationHandler = null;
    }

    _createPopupElement(){
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

      return popupElement;
    }

    _createPopupStyleElement(){
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
          border-bottom: 1px solid #e3e3e3;
          outline: none;
        }

        textarea:focus::-webkit-input-placeholder { color:transparent; }
        textarea:focus:-moz-placeholder { color:transparent; }
        textarea:focus::-moz-placeholder { color:transparent; }
        textarea:focus:-ms-input-placeholder { color:transparent; }



        .save-button {
          border: none;
          outline: none;
          cursor: pointer;
          border-top: 1px solid grey;
          font-family: monospace;
          line-height: 20px;
          background-color: #efefef;
        }

        .save-button:hover {
          background-color: #ebebeb;
        }

      `;

      return style;
    }

    _createPopupIframe(){
      const iframe = document.createElement('iframe')

      iframe.id = 'logos-translation-popup';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '-1000px'
      iframe.style.padding = '0';
      iframe.style.zIndex = '16777271';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.WebkitTransition = 'opacity 0.3s';
      iframe.style.MozTransition = 'opacity 0.3s';

      return iframe;
    }

    _attachTextAreaResizeObserver(){
      const textarea = this.popup.querySelector('.translation-textarea');
        
      let resizing = false;

      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.contentBoxSize) {
            // TODO: handle edgecase for entry.contentBoxSize
          } else {
            if (resizing === false) {
              resizing = true;
              this.iframeElement.width  = `${entry.contentRect.width + 6}px`;
              this.iframeElement.height = `${this.popupElement.offsetHeight + 6}px`;
              setTimeout(() => resizing = false, 1);
            }
            
          }
        }
      });

      resizeObserver.observe(textarea);              
    }

    _initIframe(){
      document.body.appendChild(this.iframeElement);

      const iframeDoc = this.iframeElement.contentWindow.document;
      iframeDoc.head.appendChild(this.styleElement);
      iframeDoc.body.appendChild(this.popupElement);

      this.iframeElement.height = `${this.popupElement.offsetHeight}px`;

      return iframeDoc;
    }

    _attachClickListener(){
      this.popupElement.addEventListener('click', (e) => {
        const classList = e.target.classList;
        if (classList.contains('close-icon')) this.close();
        else if (classList.contains('save-button')) this.save();
      })
    }

    registerSaveTranslationHandler(handler){
      this.saveTranslationHandler = handler;
    }

    open({x, y}){
      this.iframeElement.style.left = `${x - 150}px`;
      this.iframeElement.style.top = `${y + 10}px`;
      this.iframeElement.style.opacity = 1;
      this.textarea.focus()
    }

    close(){
      this.iframeElement.style.opacity = 0;

      setTimeout(() => {
        this.iframeElement.style.left = '-1000px';
        this.textarea.value = '';
      }, 400);
    }

    save(){
      const translation = this.textarea.value;
      this.saveTranslationHandler(translation);
      this.close();
    }
  }

  // -------------------- TRANSLATION POPUP -------------------- 

  class TranslationTooltip {

    /* 
      ### Public Methods ###
      1. open
      2. close
      3. setText
      4. clearText
    */

    constructor(){
      this.tooltipElement = this._createTooltipElement();
      this.styleElement = this._createTooltipStyleElement();
      this.iframeElement = this._createTooltipIframe();
      
      this.tooltip = this._initIframe();

    }

    _createTooltipElement(){
      const el = document.createElement('div');
  
      el.id = 'popup';
    
      const html = `
        <div class="tooltip">
          <div class="arrow"></div>
          <span class="text">Tooltip text here</span>
        </div>
      `;

      el.innerHTML = html;

      return el;
    }

    _createTooltipStyleElement(){
      const style = document.createElement('style');

      const bgcolor = 'black';
      const arrowWidth = 6;
      
      style.innerHTML = `
        body, html {
          padding: 0;
          margin: 0;
          overflow: hidden;
        }

        #popup {
          display: inline-block;
        }

        .tooltip {
          background-color: ${bgcolor};
          padding-right: 0;
          text-align: center;
          border-radius: 6px;
          padding: 10px 10px;
          position: relative;
          margin-top: 15px;
          display: inline-block;
        }

        .text {
          color: white;
        }

        .arrow {
          position: absolute;
          top: -${arrowWidth*2}px;
          left: 50%;
          transform: translateX(-${arrowWidth}px);
          border-width: ${arrowWidth}px;
          border-style: solid;
          border-color: transparent transparent ${bgcolor} transparent;
        }

      `

      return style;
    }

    _createTooltipIframe(){
      const iframe = document.createElement('iframe')

      iframe.id = 'logos-translation-tooltip';
      iframe.style.position = 'absolute';
      iframe.style.top = '100px';
      iframe.style.left = '-1000px'
      iframe.style.padding = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '1';
      iframe.style.zIndex = '16777271';
      iframe.style.WebkitTransition = 'opacity 0.3s';
      iframe.style.MozTransition = 'opacity 0.3s';
      iframe.style.display = 'inline-block'

      return iframe;
    }

    _initIframe(){
      document.body.appendChild(this.iframeElement);

      const iframeDoc = this.iframeElement.contentWindow.document;
      iframeDoc.head.appendChild(this.styleElement);
      iframeDoc.body.appendChild(this.tooltipElement);
      const textElement = this.tooltipElement.querySelector('.text');
      // this.iframeElement.width = 200 + "px";

      return iframeDoc;
    }

    open({x, y}){
      const offset = this.tooltipElement.offsetWidth / 2
      this.iframeElement.style.left = `${x - offset}px`;
      this.iframeElement.style.top = `${y}px`;
      this.iframeElement.style.opacity = 1;
    }
  
    close(){
      this.iframeElement.style.opacity = 0;
      this.iframeElement.style.left = '-1000px';
      this.clearText();
    }

    setText(str){
      const textElement = this.tooltipElement.querySelector('.text');
      textElement.innerText = str;
    }

    clearText(){
      const textElement = this.tooltipElement.querySelector('.text');
      textElement.innerText = '';
    }

  }

  // ------------------------- LOGOS ---------------------------

  class Logos {

    /* 
      ### Public Methods ###
      1. highlight
      2. addTranslation
      3. saveTranslationHandler
    */

    constructor(chromeStorageWrapper, rangyWrapper) {
      this.storage = chromeStorageWrapper;
      this.rangy = rangyWrapper;

      this._loadTranslationsAndHighlights();
      this._addMouseOverListener();

      this.translationPopup = new TranslationPopup;
      this.translationPopup.registerSaveTranslationHandler(this.saveTranslationHandler);

      this.translationTooltip = new TranslationTooltip();
    }

    async _loadTranslationsAndHighlights(){
      const url = utils.getCleanUrl();

      const pageData = await this.storage.get(url);

      if (pageData) {
        pageData.translations.forEach(selectionEntry => {
          const { serializedSelection, translation } = selectionEntry;
          this.rangy.deserializeSelection(serializedSelection);
          this.rangy.highlightSelection();

          if (translation) {
            this.rangy.addDataAttributeToSelectedElements('data-logos-translation', translation);
          } else {
            this.rangy.addDataAttributeToSelectedElements('data-logos-highlight', '');
          }
        })
      }

      utils.clearSelection();
    }

    async _saveSelection(serializedSelection, selectionText, translation){
      /*
        Data Struture
      
        url: {
          title: string,
          translations: [
            {
              serializedSelection: string
              selectionText: string
              translation: string
            }
          ]
        }
      */

      const url = utils.getCleanUrl();

      const pageData = await this.storage.get(url);

      const newTranslation = { serializedSelection, selectionText, translation };

      let data;

      if (pageData) {
        data = {
          ...pageData,
          translations: [
            ...pageData.translations,
            newTranslation
          ]
        }
      } else {
        const title = document.head.querySelector('title').innerText || url;
        console.log(document.head.querySelector('title').innerText)
        data = {
          title,
          translations: [ newTranslation ]
        }
      }

      return this.storage.set(url, data);
    }

    _addMouseOverListener(){
      document.body.addEventListener('mouseover', e => {
        if ('logosTranslation' in e.target.dataset) {
          const translation = e.target.dataset.logosTranslation;
          const { pageX } = e;
          const { top, height } = e.target.getBoundingClientRect();
          const y = top + height + window.scrollY;
          
          e.target.addEventListener('mouseout', e => {
            this.translationTooltip.close()
          }, {once: true})

          this.translationTooltip.setText(translation)
          this.translationTooltip.open({x: pageX, y})
        }
      })
    }

    saveTranslationHandler = (translation) => {
      const selectionText = this.rangy.getSelectionText();
      const serializedSelection = this.rangy.serializeSelection();
      this.rangy.highlightSelection();
      this.rangy.addDataAttributeToSelectedElements('data-logos-translation', translation);
      utils.clearSelection();
      return this._saveSelection(serializedSelection, selectionText, translation);
    }

    highlight(){
      const selectionText = this.rangy.getSelectionText();
      const serializedSelection = this.rangy.serializeSelection();
      this.rangy.highlightSelection();
      this.rangy.addDataAttributeToSelectedElements('data-logos-highlight', '');
      utils.clearSelection();
      return this._saveSelection(serializedSelection, selectionText, '');
    }

    addTranslation(){
      const targetPosition = this.rangy.getSelectionEndPosition();
      this.translationPopup.open(targetPosition);
    }
  }

  // ----------------------- MESSAGES --------------------------

  const createMsgHandler = (logos) => {
    return (message, sender, sendResponse) => { 
      const { action } = message;
      switch(action){
        case 'highlight':
          logos.highlight().catch(console.error);
          break;
        case 'addTranslation':
          logos.addTranslation();
          break;
        default:
          return
      }
    }
  }

  const init = () => {
    const chromeStorageWrapper = new ChromeStorageWrapper();
    const rangyWrapper = new RangyWrapper();
    const logos = new Logos(chromeStorageWrapper, rangyWrapper); 
    const msgHandler = createMsgHandler(logos);

    chrome.runtime.onMessage.addListener(msgHandler);    
  }

  init();
}

logosContentInit();

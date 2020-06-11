// ------------------ RANGY ------------------------

function initRangy(){
  rangy.init();

  highlighter = rangy.createHighlighter();

  addHighlighterClass('yellow')

  highlighter.addClassApplier(rangy.createClassApplier("rangy-highlight", {
    ignoreWhiteSpace: true,
    tagNames: ["span", "a"]
  })); 
}

function addHighlighterClass(color){
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

function highlightSelectedText() {
  highlighter.highlightSelection("rangy-highlight");
}

function serializeSelection(){
  console.log(rangy.serializeSelection());
}


// ----------------------- Messages ---------------------------

const msgHandler = (message, sender, sendResponse) => { 
  const { action } = message;
  switch(action){
    case 'highlight':
      highlightSelectedText();
      serializeSelection();
      break;
    case 'translate':
      break;
      translate();
    default:
      return
  }
}

initRangy()
chrome.runtime.onMessage.addListener(msgHandler);

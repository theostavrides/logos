function logosBackgroundInit(){
  const contextMenus = () => {
    chrome.contextMenus.create({
      "id": "highlight",
      "title": "Highlight",
      "contexts": ["selection"]
    });

    chrome.contextMenus.create({
      "id": "translate",
      "title": "Translate",
      "contexts": ["selection"]
    });
  }

  const handleContextMenuClick = (item, tab) => {
    const { selectionText, menuItemId } = item;
    const { url, title, id } = tab;

    switch(menuItemId) {
      case 'translate':
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
          chrome.tabs.sendMessage(tabs[0].id, {action: "translate"}, console.log);  
        });
        break
      case 'highlight':
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
          chrome.tabs.sendMessage(tabs[0].id, {action: "highlight"}, console.log);  
        });
        break
      default:
        return
    }
  }

  chrome.runtime.onInstalled.addListener(contextMenus);
  chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

}


logosBackgroundInit()
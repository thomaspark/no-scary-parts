chrome.runtime.onConnect.addListener((port) => {
  chrome.webNavigation.onHistoryStateUpdated.addListener(() => {
    port.postMessage({action: "pushstate"});
  });
});

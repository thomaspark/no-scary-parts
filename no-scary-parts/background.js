chrome.runtime.onConnect.addListener((port) => {
  chrome.webNavigation.onHistoryStateUpdated.addListener(() => {
    if (port) {
      port.postMessage({action: "pushstate"});
    }
  });
});

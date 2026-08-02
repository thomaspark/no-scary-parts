const DEBUG = false;
const json = chrome.runtime.getURL('data.json');
let progressBarObserver = null;

fetch(json)
  .then((response) => response.json())
  .then((data) => {
    const sheet = (() => {
      const style = document.createElement('style');
      style.appendChild(document.createTextNode(''));
      document.head.appendChild(style);
      return style.sheet;
    })();

    let port = chrome.runtime.connect({name: "no-scary-parts"});
    port.onMessage.addListener((msg) => {
      if (msg.action == "pushstate") {
        init(data, sheet);
      }
    });
    port.onDisconnect.addListener((msg) => {
      port = null;
    });

    init(data, sheet)
  });

function init(data, sheet) {
  document.body.classList.remove('no-scary-parts');
  const url = window.location.href.replace(/\w{2}-\w{2}\//, ''); // remove language slug for other regions

  if (sheet.cssRules.length) {
    sheet.deleteRule(0);
  }

  if (progressBarObserver) {
    progressBarObserver.disconnect();
    progressBarObserver = null;
  }

  if (url.startsWith('https://www.disneyplus.com/play/')) {
    const prefix = 'https://www.disneyplus.com/play/';
    const hash = url.split(prefix)[1];

    if (DEBUG) {
      console.log('hash:', hash);
    }

    if (hash in data) {
      const duration = data[hash].duration;
      const scenes = data[hash].scenes;
      const check = setInterval(() => {
        const video = document.querySelector('#hivePlayer1');
        if (video && video.readyState === 4) {
          clearInterval(check);
          setProgressBarStyles(duration, scenes, sheet);
        }
      }, 1000);
    }
  } else if (url.startsWith('https://www.disneyplus.com/browse/entity-')) {
    const prefix = 'https://www.disneyplus.com/browse/entity-';
    const hash = url.split('entity-')[1];

    if (DEBUG) {
      console.log('hash:', hash);
    }

    if (hash in data) {
      document.body.classList.add('no-scary-parts');
    }
  }
}

// Disney's player nests its controls inside a shadow root hosted by
// main-app-controls-overlay; that boundary can't be crossed with a plain
// querySelector, so every lookup below has to pierce it explicitly.
function getControlsOverlayRoot() {
  return document.querySelector('main-app-controls-overlay')?.shadowRoot || null;
}

function getProgressBarElement() {
  return getControlsOverlayRoot()?.querySelector('progress-bar') || null;
}

function setProgressBarStyles(duration, scenes, sheet) {
  const selector = '.progress-bar__total-duration::before';
  const color = 'purple';
  let background = `${selector} { content: ""; \
                                  position: absolute; \
                                  top: 0; \
                                  left: 0; \
                                  right: 0; \
                                  width: 100%; \
                                  height: 4px; \
                                  background: `;

  if (DEBUG) {
    console.log('duration:', duration);
  }

  scenes.forEach((scene, i) => {
    const start = (100 * scene['start'] / duration).toFixed(4);
    const end = (100 * scene['end'] / duration).toFixed(4);
    background += 'linear-gradient(90deg, ';
    background += 'transparent ' + start + '%,';
    background += color + ' ' + start + '%,';
    background += color + ' ' + end + '%,';
    background += 'transparent ' + end + '%)';

    if (i < scenes.length - 1) {
      background += ', ';
    }
  });

  background += `;} \
                .progress-bar__container:hover ${selector} { height: 6px; }`

  // progress-bar only exists in the DOM while the controls are shown, and
  // gets unmounted/remounted each time they auto-hide/reappear, so the style
  // has to be re-injected on every remount rather than just once.
  const inject = () => {
    const progressBar = getProgressBarElement();

    if (!progressBar?.shadowRoot || progressBar.shadowRoot.querySelector('style[data-no-scary-parts]')) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute('data-no-scary-parts', '');
    style.textContent = background;
    progressBar.shadowRoot.appendChild(style);
  };

  // main-app-controls-overlay itself can take a moment to attach after the
  // video becomes ready, so retry rather than giving up on the first miss.
  const attach = (attemptsLeft) => {
    const overlayRoot = getControlsOverlayRoot();

    if (!overlayRoot) {
      if (attemptsLeft > 0) {
        setTimeout(() => attach(attemptsLeft - 1), 500);
      }
      return;
    }

    inject();
    progressBarObserver = new MutationObserver(inject);
    progressBarObserver.observe(overlayRoot, { childList: true, subtree: true });
  };

  attach(20);
}

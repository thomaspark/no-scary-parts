const DEBUG = false;
const json = chrome.runtime.getURL('data.json');
let buffering = false;
let seeking = false;
let clickDelay;

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
        const video = document.querySelector('#hivePlayer');
        if (video && video.readyState === 4) {
          clearInterval(check);
          setProgressBarStyles(duration, scenes, sheet);

          video.addEventListener('seeking', () => {
            buffering = true;
            seeking = true;
          });

          video.addEventListener('waiting', () => {
            buffering = true;
          });

          video.addEventListener('seeked', () => {
          });

          video.addEventListener('canplay', () => {
            buffering = false;
          });

          video.addEventListener('canplaythrough', () => {
            buffering = false;
          });

          video.addEventListener('timeupdate', () => {
            if (!buffering) {
              checkTime(video, scenes, duration);
            }
          });
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

function currentTime() {
  const progressBar = document.querySelector('disney-web-player-ui .progress-bar');
  const slider = progressBar.querySelector('.slider-handle-container.from-left');
  const width = slider.getAttribute('style').replace('width: ', '').replace('%;', '');

  return width / 100;
}

function checkTime(video, scenes, duration) {
  const time = currentTime();

  if (DEBUG) {
    console.log(time);
  }
  
  scenes.forEach((scene) => {
    const start = scene['start'] / duration;
    const end = scene['end'] / duration;

    if ((start <= time) && (time < end)) {
      const diffPercentage = end - time;
      const diff = diffPercentage * duration;
      const skips = Math.ceil(diff/10);
      const btn = document.querySelector('quick-fast-forward').shadowRoot.querySelector('info-tooltip button');

      if (seeking) {
        clearTimeout(clickDelay);
        clickDelay = setTimeout(() => {
          for (let i = 0; i < skips; i++) {
            btn.click();
          }

          seeking = false;
        }, 1500);
      } else {
        for (let i = 0; i < skips; i++) {
          btn.click();
        }
      }

      buffering = true;
    }
  });

}

function setProgressBarStyles(duration, scenes, sheet) {
  const selector = '.progress-bar .slider-container:before';
  const color = 'purple';
  let background = 'background: ';

  if (DEBUG) {
    console.log('duration:', duration);
  }

  scenes.forEach((scene, i) => {
    const start = (100 * scene['start'] / duration).toFixed(4);
    const end = (100 * scene['end'] / duration).toFixed(4);
    const width = (end - start);
    background += 'linear-gradient(90deg, ';
    background += 'transparent ' + start + '%,';
    background += color + ' ' + start + '%,';
    background += color + ' ' + end + '%,';
    background += 'transparent ' + end + '%)';

    if (i < scenes.length - 1) {
      background += ', ';
    }
  });

  background += ';'

  sheet.insertRule(selector + '{' + background + '}', 0);
}

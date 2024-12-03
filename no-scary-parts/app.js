const DEBUG = false;
const json = chrome.runtime.getURL('data.json');

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

    for (let id in data) {
      if (data[id].hash == hash) {
        const duration = data[id].duration;
        const scenes = data[id].scenes;
        const check = setInterval(() => {
        const video = document.querySelector('#hivePlayer');

          if (video && video.readyState === 4) {
            clearInterval(check);
            setProgressBarStyles(duration, scenes, sheet);

            video.addEventListener('seeking', () => {
              checkTime(video, scenes);
            });

            video.addEventListener('timeupdate', () => {
              checkTime(video, scenes);
            });
          }
        }, 100);
      }
    }
  } else if (url.startsWith('https://www.disneyplus.com/browse/entity-')) {
    const prefix = 'https://www.disneyplus.com/browse/entity-';
    const hash = url.split('entity-')[1];

    if (DEBUG) {
      console.log('hash:', hash);
    }

    for (let id in data) {
      if (data[id].hash == hash) {
        document.body.classList.add('no-scary-parts');
        break;
      }
    }
  }
}

function checkTime(video, scenes) {
  if (DEBUG) {
    console.log(video.currentTime);
  }
  
  scenes.forEach((scene) => {
    if ((scene['start'] <= video.currentTime) && (video.currentTime < scene['end'])) {
      video.currentTime = scene['end'];
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

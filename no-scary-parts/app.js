
const json = chrome.runtime.getURL('data.json');

fetch(json)
  .then((response) => response.json())
  .then((data) => {
    const sheet = (function() {
      const style = document.createElement('style');
      style.appendChild(document.createTextNode(''));
      document.head.appendChild(style);
      return style.sheet;
    })();

    const port = chrome.runtime.connect({name: "no-scary-parts"});
    port.onMessage.addListener(function(msg) {
      if (msg.action == "pushstate") {
        init(data, sheet);
      }
    });

    init(data, sheet)
  });

function init(data, sheet) {
  document.body.classList.remove('no-scary-parts');
  const url = window.location.href;

  if (sheet.cssRules.length) {
    sheet.deleteRule(0);
  }

  if (url.startsWith('https://www.disneyplus.com/video/')) {
    const prefix = 'https://www.disneyplus.com/video/';
    const id = url.split(prefix)[1];

    console.log('id', id);

    if (id in data) {
      const scenes = data[id].scenes;
      const check = setInterval(() => {
        const video = document.querySelector('#hudson-wrapper video');

        if (video && video.readyState === 4) {
          clearInterval(check);
          setProgressBarStyles(video, scenes, sheet);

          video.addEventListener('seeking', () => {
            checkTime(video, scenes);
          });

          video.addEventListener('timeupdate', () => {
            checkTime(video, scenes);
          });
        }
      }, 100);
    }
  } else if (url.startsWith('https://www.disneyplus.com/movies/')) {
    const prefix = 'https://www.disneyplus.com/movies/';
    const slug = url.split('/')[4];

    console.log('slug', slug);

    for (let id in data) {
      if (data[id].slug == slug) {
        document.body.classList.add('no-scary-parts');
        break;
      }
    }
  }
}

function checkTime(video, scenes) {
  console.log(video.currentTime);
  
  scenes.forEach((scene) => {
    if ((scene.start <= video.currentTime) && (video.currentTime < scene.end)) {
      video.currentTime = scene.end;
    }
  });
}

function setProgressBarStyles(video, scenes, sheet) {
  const selector = '.progress-bar .slider-container:before';
  const duration = video.duration;
  const color = 'purple';
  let background = '';

  console.log('duration:', duration);

  scenes.forEach((scene) => {
    const start = (100 * scene.start / duration).toFixed(0);
    const end = (100 * scene.end / duration).toFixed(0);
    background += 'transparent ' + start + '%, ';
    background += color + ' ' + start + '%, ';
    background += color + ' ' + end + '%, ';
    background += 'transparent ' + end + '%, ';
  });

  background = 'background: linear-gradient(to right, transparent, ' + background + 'transparent);';

  sheet.insertRule(selector + '{' + background + '}', 0);
}

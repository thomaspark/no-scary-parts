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
  const url = window.location.href;

  if (sheet.cssRules.length) {
    sheet.deleteRule(0);
  }

  if (url.startsWith('https://www.disneyplus.com/video/')) {
    const prefix = 'https://www.disneyplus.com/video/';
    const id = url.split(prefix)[1];

    if (DEBUG) {
      console.log('id:', id);
    }

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

    if (DEBUG) {
      console.log('slug:', slug);
    }

    for (let id in data) {
      if (data[id].slug == slug) {
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
    const end = convertTimeToSeconds(scene.end)
    if ((convertTimeToSeconds(scene.start) <= video.currentTime) && (video.currentTime < end)) {
      video.currentTime = end;
    }
  });
}

function convertTimeToSeconds(timeWithOrWithoutColons) {
  // input could be 34 representing 34 seconds
  // or input could be "34" representing 34 seconds
  // or input could be "1:34" representing 1 min and 34 sec
  // or input could be "1:32:34" representing 1 hr, 32 min, and 34 seconds
  // input must be string or number
  // return value is time in seconds as number
  let seconds = 0;
  if(typeof timeWithOrWithoutColons == 'number'){
    seconds = timeWithOrWithoutColons;
  } else {
    const timeParts = timeWithOrWithoutColons.split(':').map(x => parseFloat((x)));
    if (timeParts.length == 1) {
      seconds = timeParts[0];
    } else if (timeParts.length == 2) {
      seconds = timeParts[0]*60 + timeParts[1];
    } else if (timeParts.length == 3) {
      seconds = timeParts[0]*60*60 + timeParts[1]*60 + timeParts[2];
    } else {
      throw 'Unexpected time to convert to seconds '+timeWithOrWithoutColons;
    }
  }
  return seconds;
}

function setProgressBarStyles(video, scenes, sheet) {
  const selector = '.progress-bar .slider-container:before';
  const duration = convertTimeToSeconds(video.duration);
  const color = 'purple';
  let background = 'background: ';

  if (DEBUG) {
    console.log('duration:', duration);
  }

  scenes.forEach((scene, i) => {
    const start = (100 * convertTimeToSeconds(scene.start) / duration).toFixed(4);
    const end = (100 * convertTimeToSeconds(scene.end) / duration).toFixed(4);
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

fetch('data.json')
  .then(response => response.json())
  .then(data => loadTitles(data));

function loadTitles(data) {
  let html = '';

  for (let key in data) {
    const movie = data[key];
    const title = movie.title;
    const count = movie.scenes.length;
    const url = 'https://www.disneyplus.com/movies/' + movie.slug + '/' + movie.url;
    const bar = createBar(movie.scenes, movie.duration);

    html += `<tr><td><a target="_blank" href="${url}">${movie.title}</a></td><td>${bar}</td></tr>`;
  }

  $('#titles tbody').append(html);
}

function createBar(scenes, duration) {
  let html = '';

  for (const [key, scene] of Object.entries(scenes)) {
    const left = (100 * scene.start / duration).toFixed(2);
    const width = (100 * (scene.end - scene.start) / duration).toFixed(2);
    const title = timestamp(scene.start) + ' to ' + timestamp(scene.end);

    let style = `left: ${left}%; width: ${width}%;`;
    html += `<span class="scene" style="${style}" title="${title}"></span>`;
  }

  return `<span class="bar">${html}</span>`;
}

function timestamp(time) {
  const hours = Math.floor(time / 60 / 60);
  const minutes = Math.floor(time / 60) - (hours * 60);
  const seconds = Math.floor(time % 60);

  return hours + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
}
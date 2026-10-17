// Prepare every image used by this page before revealing its content.
// A manual exit is offered if a request stalls; normal loading still waits.
(() => {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  let finished = false;
  root.classList.add('is-loading');

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(fallback);
    const delay = reducedMotion.matches ? 0 : Math.max(0, 350 - (performance.now() - started));
    setTimeout(() => {
      root.classList.remove('is-loading');
      root.classList.add('is-loaded');
      setTimeout(() => root.classList.remove('is-loaded'), reducedMotion.matches ? 0 : 400);
    }, delay);
  };
  const fallback = setTimeout(() => {
    const loader = document.querySelector('.page-loader-inner');
    if (!loader) return finish();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'page-loader-continue';
    button.textContent = 'View page now';
    button.addEventListener('click', finish, { once: true });
    loader.append(button);
    const label = document.querySelector('.page-loader-label');
    if (label) label.textContent = 'Images are taking longer to load';
  }, 30000);

  document.addEventListener('DOMContentLoaded', async () => {
    const images = [...document.querySelectorAll('main img')].filter(image => image.getAttribute('src'));
    const extraSources = [
      ...[...document.querySelectorAll('main video[poster]')].map(video => video.poster),
      ...[...document.querySelectorAll('main img[data-animated-src], main img[data-static-src]')]
        .flatMap(image => [image.dataset.animatedSrc, image.dataset.staticSrc])
    ].filter(Boolean);
    const extras = [...new Set(extraSources)].map(source => {
      const image = new Image();
      image.src = source;
      return image;
    });
    const allImages = [...images, ...extras];
    const progress = document.createElement('span');
    progress.className = 'page-loader-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.querySelector('.page-loader-inner')?.append(progress);
    let completed = 0;
    const updateProgress = () => { progress.textContent = `${allImages.length ? Math.round((completed / allImages.length) * 100) : 100}%`; };
    updateProgress();
    await Promise.allSettled([
      document.fonts?.ready,
      ...allImages.map(image => {
        image.loading = 'eager';
        const ready = image.decode ? image.decode() : image.complete ? Promise.resolve() : new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
        return Promise.resolve(ready).finally(() => { completed++; updateProgress(); });
      })
    ]);
    finish();
  }, { once: true });

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      root.classList.remove('is-loading', 'is-loaded');
      finished = true;
      clearTimeout(fallback);
    }
  });
})();

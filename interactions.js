const byId = id => document.getElementById(id);
const lightbox = byId('lightbox');
const journalData = byId('journal-data');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function displayInLightbox(source, caption, count = '') {
  const image = byId('lightbox-image');
  image.src = source;
  image.alt = '';
  byId('lightbox-caption').textContent = caption;
  byId('lightbox-count').textContent = count;
  byId('lightbox-nav').hidden = !count;
  if (!lightbox.open) lightbox.showModal();
}

if (lightbox?.showModal) {
  document.querySelectorAll('[data-roots]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      displayInLightbox(link.href, link.querySelector('img').alt);
    });
  });
  lightbox.addEventListener('click', event => {
    if (event.target !== lightbox) return;
    const bounds = lightbox.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) lightbox.close();
  });
}

if (journalData) {
  const days = JSON.parse(journalData.textContent);
  const daysControl = document.querySelector('.date-selector');
  const dayButtons = [...daysControl.querySelectorAll('button')];
  const thumbnails = byId('thumbnails');
  const image = byId('story-image');
  const photoLink = byId('open-photo');
  const story = byId('photo-story');
  const grid = byId('photo-grid');
  const layoutControl = document.querySelector('.layout-switch');
  const layoutButtons = layoutControl ? [...layoutControl.querySelectorAll('button')] : [];
  const requestedDay = new URLSearchParams(location.search).get('day');
  const dayIndex = days.findIndex(entry => entry.id === requestedDay);
  let day = dayIndex === -1 ? days.length - 1 : dayIndex;
  let photo = 0;

  function updateDateLinks() {
    if (!days[day].id || location.protocol === 'file:') return;
    const address = new URL(location.href);
    address.searchParams.set('day', days[day].id);
    history.replaceState(null, '', address);
    document.querySelectorAll('.language-options a:not([hreflang="pt"])').forEach(link => {
      const localized = new URL(link.href);
      localized.searchParams.set('day', days[day].id);
      localized.hash = address.hash;
      link.href = localized.href;
    });
  }

  function renderPhoto(animate = false) {
    const photos = days[day].photos;
    const { file, caption } = photos[photo];
    const count = `${photo + 1} / ${photos.length}`;
    image.src = file;
    image.alt = caption;
    photoLink.href = file;
    byId('story-caption').textContent = caption;
    byId('photo-count').textContent = count;
    [...thumbnails.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === photo)));
    if (animate && !reducedMotion.matches) image.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 220 });
    if (lightbox.open) displayInLightbox(file, caption, count);
  }

  function renderDay(animate = false) {
    const entry = days[day];
    byId('story-date').textContent = entry.date;
    byId('story-title').textContent = entry.title;
    byId('story-summary').textContent = entry.summary;
    dayButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === day)));
    const photos = entry.photos.map(({ file, caption }, index) => {
      const button = document.createElement('button');
      const thumb = document.createElement('img');
      button.type = 'button';
      button.setAttribute('aria-label', caption);
      thumb.src = file;
      thumb.alt = '';
      thumb.loading = 'lazy';
      button.append(thumb);
      button.addEventListener('click', () => {
        photo = index;
        renderPhoto(true);
      });
      return button;
    });
    thumbnails.replaceChildren(...photos);
    if (grid && !grid.hidden) renderGrid();
    renderPhoto(animate);
  }

  function renderGrid() {
    const photos = days[day].photos;
    grid.replaceChildren(...photos.map(({ file, caption }, index) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const picture = document.createElement('img');
      const text = document.createElement('span');
      picture.src = file;
      picture.loading = 'lazy';
      picture.alt = '';
      text.textContent = caption;
      link.href = file;
      link.append(picture, text);
      item.append(link);
      if (lightbox?.showModal) {
        link.addEventListener('click', event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          photo = index;
          renderPhoto();
          displayInLightbox(file, caption, byId('photo-count').textContent);
        });
      }
      return item;
    }));
  }

  layoutButtons.forEach(button => {
    button.addEventListener('click', () => {
      const gridView = button.dataset.layout === 'grid';
      if (gridView && grid.hidden) renderGrid();
      grid.hidden = !gridView;
      story.hidden = gridView;
      layoutButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    });
  });

  function stepPhoto(direction) {
    const count = days[day].photos.length;
    photo = (photo + direction + count) % count;
    renderPhoto(true);
  }

  dayButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (index === day) return;
      day = index;
      photo = 0;
      renderDay(true);
      updateDateLinks();
    });
  });
  if (lightbox?.showModal) {
    photoLink.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const { file, caption } = days[day].photos[photo];
      displayInLightbox(file, caption, byId('photo-count').textContent);
    });
    byId('previous-photo').addEventListener('click', () => stepPhoto(-1));
    byId('next-photo').addEventListener('click', () => stepPhoto(1));
    lightbox.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      stepPhoto(event.key === 'ArrowLeft' ? -1 : 1);
    });
    const expandedPhoto = byId('lightbox-image');
    let swipeOrigin;
    expandedPhoto.addEventListener('touchstart', event => {
      swipeOrigin = event.touches.length === 1 ? event.touches[0] : null;
    }, { passive: true });
    expandedPhoto.addEventListener('touchcancel', () => { swipeOrigin = null; });
    expandedPhoto.addEventListener('touchend', event => {
      if (!swipeOrigin) return;
      const touch = event.changedTouches[0];
      const x = touch.clientX - swipeOrigin.clientX;
      const y = touch.clientY - swipeOrigin.clientY;
      if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y) * 1.5) stepPhoto(x < 0 ? 1 : -1);
      swipeOrigin = null;
    });
  }
  renderDay();
  if (dayIndex !== -1) updateDateLinks();
  daysControl.hidden = false;
  if (layoutControl) layoutControl.hidden = false;
}

const strip = byId('day-strip');
if (strip) {
  const controls = document.querySelector('.strip-controls');
  const [earlier, later] = controls.querySelectorAll('button');

  function updateStripControls() {
    earlier.disabled = strip.scrollLeft < 4;
    later.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
  }

  controls.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      const [first, second] = strip.children;
      strip.scrollBy({
        left: (second.offsetLeft - first.offsetLeft) * Number(button.dataset.stripStep),
        behavior: reducedMotion.matches ? 'instant' : 'smooth'
      });
    });
  });
  strip.addEventListener('scroll', updateStripControls, { passive: true });
  new ResizeObserver(updateStripControls).observe(strip);
  updateStripControls();
  controls.hidden = false;
}

const share = byId('share');
if (share) {
  share.hidden = false;
  share.addEventListener('click', async () => {
    const address = new URL(location.href);
    address.hash = '';
    address.search = '';
    const field = byId('share-url');
    const message = byId('share-status');
    try {
      await navigator.clipboard.writeText(address.href);
      message.textContent = share.dataset.copied;
      field.hidden = true;
    } catch {
      message.textContent = share.dataset.manual;
      field.value = address.href;
      field.hidden = false;
      field.select();
    }
  });
}

const languageMenu = document.querySelector('.language-menu');
document.addEventListener('click', event => {
  if (languageMenu.open && !languageMenu.contains(event.target)) languageMenu.open = false;
});
languageMenu.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !languageMenu.open) return;
  languageMenu.open = false;
  languageMenu.querySelector('summary').focus();
});

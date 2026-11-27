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
  let day = days.length - 1;
  let photo = 0;

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
    renderPhoto(animate);
  }

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
  }
  renderDay();
  daysControl.hidden = false;
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

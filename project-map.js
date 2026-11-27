(() => {
  const data = JSON.parse(document.getElementById('project-map-data').textContent);
  const frame = document.getElementById('project-map');
  const reset = document.getElementById('map-reset');
  const places = new Map(data.places.map(place => [place.id, place]));
  const links = [...document.querySelectorAll('.map-places [data-place]')];
  const panels = [...document.querySelectorAll('.map-details .map-area')];
  const pins = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let map;
  let selected;

  function fromHash() {
    return location.hash.slice('#area-'.length);
  }

  function select(id) {
    selected = places.has(id) ? id : 'labalen';
    panels.forEach(panel => { panel.hidden = panel.id !== `area-${selected}`; });
    links.forEach(link => {
      if (link.dataset.place === selected) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    pins.forEach((button, key) => button.setAttribute('aria-pressed', String(key === selected)));
    document.querySelectorAll('.language-options a:not([hreflang="pt"])').forEach(link => {
      link.hash = `area-${selected}`;
    });
  }

  function choose(id, center = false) {
    select(id);
    if (location.protocol !== 'file:') history.replaceState(null, '', `#area-${selected}`);
    if (!map) return;
    map.closePopup();
    if (center) map.panInside(places.get(selected).point, { padding: [80, 80], animate: !reducedMotion.matches });
  }

  links.forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    choose(link.dataset.place, true);
  }));
  window.addEventListener('hashchange', () => select(fromHash()));
  select(fromHash());

  const styles = {
    buildings: { stroke: false, fillColor: '#b5b8ac', fillOpacity: 0.55 },
    main: { color: '#6e806b', weight: 3.7, opacity: 0.8 },
    road: { color: '#81947f', weight: 2.8, opacity: 0.86 },
    trail: { color: '#9ba996', weight: 1.6, dashArray: '4 5', opacity: 0.9 },
    green: { stroke: false, fillColor: '#c3d4bb', fillOpacity: 0.7 },
    water: { color: '#8aa9ac', fillColor: '#b8cfd0', fillOpacity: 0.7 }
  };

  function createPin(place) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `map-pin${place.id === 'labalen' ? ' map-pin-project' : ''}`;
    button.textContent = place.name;
    button.setAttribute('aria-label', `${place.name} · ${place.label}`);
    button.setAttribute('aria-pressed', String(place.id === selected));
    L.DomEvent.disableClickPropagation(button);
    button.addEventListener('click', () => {
      choose(place.id);
      const popup = document.createElement('div');
      const label = document.createElement('strong');
      const detailLink = document.createElement('a');
      label.textContent = place.label;
      detailLink.textContent = data.details;
      detailLink.href = `#area-${place.id}`;
      detailLink.addEventListener('click', () => {
        const title = document.getElementById(`area-${place.id}-title`);
        title.tabIndex = -1;
        title.focus({ preventScroll: true });
        title.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      });
      popup.append(label, detailLink);
      L.popup({ closeButton: false, offset: [0, -48], className: 'map-place-popup' })
        .setLatLng(place.point).setContent(popup).openOn(map);
    });
    L.marker(place.point, {
      icon: L.divIcon({ className: 'map-pin-anchor', html: button, iconSize: [0, 0], iconAnchor: [0, 0] }),
      keyboard: false,
      zIndexOffset: place.id === 'labalen' ? 50 : 0
    }).addTo(map);
    pins.set(place.id, button);
  }

  async function loadMap() {
    if (!window.L) return;
    try {
      const result = await fetch('labalen-area.geojson');
      if (!result.ok) return;
      const geometry = await result.json();
      const [west, south, east, north] = geometry.bbox;
      frame.hidden = false;
      map = L.map(frame, {
        preferCanvas: true, scrollWheelZoom: false, zoomControl: false,
        minZoom: 12, maxZoom: 17, zoomSnap: 0.25, zoomDelta: 0.75,
        maxBounds: L.latLngBounds([south, west], [north, east]).pad(0.24), maxBoundsViscosity: 0.85
      });
      map.attributionControl.setPrefix(false);
      map.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');
      L.control.zoom({ zoomInTitle: data.zoomIn, zoomOutTitle: data.zoomOut, position: 'topleft' }).addTo(map);
      const bounds = L.latLngBounds(data.places.map(place => place.point));
      let atOverview = true;
      function overview() {
        map.fitBounds(bounds, { padding: [65, 84], maxZoom: 15, animate: false });
        atOverview = true;
      }
      overview();
      map.on('dragstart zoomstart', () => { atOverview = false; });
      map.on('resize', () => { if (atOverview) overview(); });
      L.geoJSON(geometry, { style: ({ properties }) => styles[properties.kind], interactive: false }).addTo(map);
      data.places.forEach(createPin);

      reset.addEventListener('click', () => {
        choose('labalen');
        overview();
      });
      reset.hidden = false;
      document.getElementById('map-legend').hidden = false;
      document.getElementById('map-fallback').hidden = true;
    } catch {
      if (map) map.remove();
      map = undefined;
      frame.hidden = true;
    }
  }

  loadMap();
})();

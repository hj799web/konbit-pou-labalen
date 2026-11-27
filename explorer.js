(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');

  function animateIn(element, distance = 10) {
    if (motion.matches || !element.animate) return;
    element.animate(
      [{ opacity: 0.72, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 330, easing: 'cubic-bezier(.2,.75,.25,1)' }
    );
  }

  document.querySelectorAll('[data-tabs]').forEach(container => {
    const list = container.querySelector('[data-tablist]');
    const tabs = [...list.querySelectorAll('a')];
    const panels = tabs.map(tab => document.getElementById(tab.dataset.panel || tab.hash.slice(1)));
    const road = container.hasAttribute('data-road-tabs');
    const defaultTab = container.dataset.default === 'last' ? tabs.length - 1 : 0;
    let selected = -1;

    function indexFromHash() {
      const target = document.getElementById(location.hash.slice(1));
      return target ? panels.findIndex(panel => panel.contains(target)) : -1;
    }

    function select(index, interactive = false) {
      if (index === selected) return;
      selected = index;
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (interactive) animateIn(panels[index]);
    }

    function updateRoadLanguageLinks() {
      document.querySelectorAll('.language-options [hreflang]:not([hreflang="pt"])').forEach(link => {
        const address = new URL(link.href);
        address.hash = location.hash;
        link.href = address.href;
      });
    }

    function activate(index) {
      const bringPanelIntoView = road && index !== selected && container.getBoundingClientRect().top < -30;
      select(index, true);
      if (bringPanelIntoView) container.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (!road || location.hash === tabs[index].hash) return;
      history.pushState(null, '', tabs[index].hash);
      updateRoadLanguageLinks();
    }

    list.setAttribute('role', 'tablist');
    tabs.forEach((tab, index) => {
      const panel = panels[index];
      tab.id = `${panel.id}-tab`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      tab.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        activate(index);
      });
      tab.addEventListener('keydown', event => {
        const nextIndex = {
          ArrowLeft: (index + tabs.length - 1) % tabs.length,
          ArrowRight: (index + 1) % tabs.length,
          Home: 0,
          End: tabs.length - 1,
          ' ': index
        }[event.key];
        if (nextIndex === undefined) return;
        event.preventDefault();
        activate(nextIndex);
        tabs[nextIndex].focus();
      });
    });

    const syncHash = () => {
      const index = indexFromHash();
      if (index !== -1 || road) select(index === -1 ? defaultTab : index);
      if (road) updateRoadLanguageLinks();
    };
    const initial = indexFromHash();
    select(initial === -1 ? defaultTab : initial);
    if (road) updateRoadLanguageLinks();
    window.addEventListener('hashchange', syncHash);
  });

  const comparison = document.querySelector('[data-comparison]');
  if (comparison) {
    const control = comparison.querySelector('input');
    const divider = comparison.querySelector('.compare-divider');
    const moveDivider = () => comparison.style.setProperty('--split', `${control.value}%`);
    control.addEventListener('input', moveDivider);
    moveDivider();
    comparison.dataset.ready = '';
    control.hidden = false;
    divider.hidden = false;
  }

  if (!motion.matches && 'IntersectionObserver' in window) {
    const entering = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateIn(entry.target, 13);
        entering.unobserve(entry.target);
      });
    }, { threshold: 0.18 });
    document.querySelectorAll('[data-reveal]').forEach(element => entering.observe(element));
  }
})();

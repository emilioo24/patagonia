import { BEER_FORMATS, catalog, type CatalogItem } from '../data/catalog';
import { refugios, type Refugio } from '../data/refugios';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function buildBeerCard(item: CatalogItem) {
  const card = element('li', 'beer-card');
  card.style.setProperty('--accent', item.accent);

  const specs = element('dl', 'beer-specs');
  for (const [label, value] of item.specs) {
    const row = element('div');
    row.append(element('dt', undefined, label), element('dd', undefined, value));
    specs.append(row);
  }

  card.append(
    element('p', 'beer-tag', item.tag),
    element('h3', 'beer-name', item.name),
    element('p', 'beer-style', item.style),
    element('p', 'beer-description', item.description),
    specs,
  );
  if (item.pairing) card.append(element('p', 'beer-pairing', item.pairing));
  return card;
}

function mapUrl(refugio: Refugio) {
  const query = `Cerveza Patagonia ${refugio.name}, ${refugio.address}, ${refugio.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildRefugioItem(refugio: Refugio) {
  const item = element('li', 'refuge-item');
  const link = element('a', 'refuge-map', 'Cómo llegar');
  link.href = mapUrl(refugio);
  link.target = '_blank';
  link.rel = 'noopener';
  link.setAttribute('aria-label', `Cómo llegar a ${refugio.name}`);

  item.append(
    element('h3', 'refuge-name', refugio.name.replace(/^Refugio /, '')),
    element('p', 'refuge-address', refugio.address),
    element('p', 'refuge-place', refugio.city === refugio.province ? refugio.city : `${refugio.city}, ${refugio.province}`),
  );
  if (refugio.note) item.append(element('p', 'refuge-note', refugio.note));
  item.append(link);
  return item;
}

function startRefugios() {
  const list = document.querySelector<HTMLElement>('#refuge-list')!;
  const filter = document.querySelector<HTMLSelectElement>('#refuge-filter')!;
  const more = document.querySelector<HTMLButtonElement>('#refuge-more')!;
  const count = document.querySelector<HTMLElement>('#refuge-count')!;

  const provinces = [...new Set(refugios.map((refugio) => refugio.province))].sort((a, b) => a.localeCompare(b, 'es'));
  for (const province of provinces) {
    const option = element('option', undefined, province);
    option.value = province;
    filter.append(option);
  }

  let showAll = false;
  const render = () => {
    const province = filter.value;
    const visible = province
      ? refugios.filter((refugio) => refugio.province === province)
      : showAll
        ? refugios
        : refugios.filter((refugio) => refugio.featured);

    list.replaceChildren(...visible.map(buildRefugioItem));
    more.hidden = Boolean(province) || showAll;
    count.textContent = province ? `${visible.length} en ${province}` : `${refugios.length} lugares`;
  };

  filter.addEventListener('change', render);
  more.addEventListener('click', () => {
    showAll = true;
    render();
    list.children[5]?.querySelector('a')?.focus(); // el primero de los que recién aparecieron
  });
  more.textContent = `Ver los ${refugios.length}`;
  render();
}

/** Completa con datos las secciones que siguen al recorrido. */
export function renderSections() {
  document.querySelector('#beer-list')!.replaceChildren(...catalog.map(buildBeerCard));
  document.querySelector('#beer-formats')!.textContent = BEER_FORMATS;
  startRefugios();

  // El menú en mobile se cierra al elegir una sección
  const menu = document.querySelector<HTMLElement>('#site-menu')!;
  const toggle = document.querySelector<HTMLButtonElement>('#menu-toggle')!;
  const setOpen = (open: boolean) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  menu.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false);
  });
}

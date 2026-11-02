import { TODO, varieties, type Variety, type VarietyId } from '../data/varieties';
import type { VesselKind } from '../three/vessels/types';

// Lado del panel en escritorio; la lata se corre hacia el lado contrario
const SIDES: Record<VarietyId, 'left' | 'right'> = {
  amber: 'right',
  km247: 'left',
  vera: 'right',
};

const VESSEL_OPTIONS: { kind: VesselKind; name: string }[] = [
  { kind: 'can', name: 'Lata' },
  { kind: 'bottle', name: 'Botella' },
  { kind: 'glass', name: 'Vaso' },
];

/** Envase elegido. La escena 3D lo lee en cada frame. */
export interface VesselChoice {
  kind: VesselKind;
}

export function createVarietyPanels(container: HTMLElement, choice: VesselChoice) {
  const buttons: HTMLButtonElement[] = [];

  // La elección es una sola: los tres paneles muestran la misma
  const select = (kind: VesselKind) => {
    choice.kind = kind;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.vessel === kind));
    }
  };

  const build = (variety: Variety) => {
    const slot = document.createElement('div');
    slot.className = 'panel-slot';
    slot.dataset.side = SIDES[variety.id];

    const panel = document.createElement('article');
    panel.className = 'variety-panel';
    panel.style.setProperty('--accent', variety.accent);

    const title = document.createElement('h2');
    title.textContent = variety.name;

    const description = document.createElement('p');
    description.textContent = variety.description;

    const specs = document.createElement('dl');
    for (const [term, value] of [
      ['IBU', variety.ibu],
      ['ABV', variety.abv],
    ]) {
      if (value === TODO) continue; // lo que no está confirmado no se muestra
      const item = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = term;
      dd.textContent = value;
      item.append(dt, dd);
      specs.append(item);
    }

    const picker = document.createElement('div');
    picker.className = 'vessel-picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', `Envase de ${variety.name}`);
    for (const option of VESSEL_OPTIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.vessel = option.kind;
      button.textContent = option.name;
      button.addEventListener('click', () => select(option.kind));
      picker.append(button);
      buttons.push(button);
    }

    panel.append(title, description, specs, picker);
    slot.append(panel);
    container.append(slot);
    return panel;
  };

  const [amber, km247, vera] = varieties.map(build);
  select(choice.kind);
  return { amber, km247, vera };
}

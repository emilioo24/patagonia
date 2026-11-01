import { assetUrl, hasLocalAsset } from '../data/localAssets';

const LOGO = '/assets/img/logo.png';

/** Si existe el logo real, reemplaza al texto "PATAGONIA" provisorio. */
export function loadBrandLogo() {
  if (!hasLocalAsset(LOGO)) return;

  const logo = new Image();
  logo.alt = 'Patagonia';
  logo.className = 'brand-logo';
  logo.onload = () => {
    document.querySelector('#brand')?.replaceChildren(logo);
  };
  logo.src = assetUrl(LOGO);
}

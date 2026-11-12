# Atesta web

Web de Atesta: los precios de los combustibles en Portugal, con los datos oficiales de la
DGEG. Es una web estática: un script de Node genera todas las páginas y Cloudflare Pages
las sirve. Sin dependencias.

## Cómo funciona

1. `node scripts/fetch.mjs` descarga los precios de la DGEG y los titulares de Google
   Notícias y los guarda en `data/`:
   - `stations.json`: todos los postos con sus precios (una línea por posto).
   - `history.json`: la media de cada día por combustible y distrito.
   - `news.json`: titulares sobre los precios de la próxima semana.
2. `node scripts/build.mjs` genera la web en `dist/`.
3. `node scripts/serve.mjs` la sirve en http://localhost:4321/ para verla.

GitHub Actions (`.github/workflows/update.yml`) repite el paso 1 cada 2 horas y, si los
datos cambiaron, hace push. Cloudflare Pages ve el push y vuelve a generar la web.

## Cloudflare Pages

- Comando de compilación: `npm run build`
- Carpeta de salida: `dist`
- Variables: `NODE_VERSION=20`, `SITE_URL` (la dirección pública) y `SITE_INDEX=1`
  solo cuando la web esté en su dominio definitivo. Sin `SITE_INDEX=1`, todas las
  páginas llevan `noindex` y `robots.txt` bloquea a los buscadores.

## Páginas

| URL | Qué es |
|---|---|
| `/` | Precios medios de hoy, los más baratos por distrito o cerca de ti y la previsión |
| `/gasoleo/`, `/gasolina/`, `/gpl/` | Una página por combustible |
| `/proxima-semana/` | Previsión del lunes a partir de los titulares (misma lógica que la app) |
| `/postos/`, `/postos/<distrito>/`, `/postos/<distrito>/<concelho>/` | Postos por zona |
| `/posto/<nombre>-<id>/` | Ficha de cada posto |
| `/marcas/`, `/marcas/<marca>/` | Precio medio por marca |
| `/app/` | La app Atesta |

## Diseño

Los mismos colores, letra (Barlow, servida desde la propia web) y panel de precios de 7
segmentos que la app (`ui/Theme.kt` y `ui/SegmentDisplay.kt`). Textos en português de
Portugal, de tú.

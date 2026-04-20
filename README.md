# El Sistema v9

App web de gestión editorial para **Básico.fm** y **Los Dioses del Marketing**. Express + Redis, desplegada en Railway.

## Archivos

- `el_sistema_v9.html` — app completa (1 sola página, ~1.3 MB con data embebida en base64)
- `server.js` — servidor Express que sirve el HTML y expone `/api/estado`
- `package.json` — dependencias (`express`, `compression`, `redis`)

## Variables de entorno

| Variable    | Obligatoria | Descripción                                                                 |
|-------------|-------------|------------------------------------------------------------------------------|
| `REDIS_URL` | sí (prod)   | URL de Redis (`redis://default:pass@trolley.proxy.rlwy.net:PUERTO`)          |
| `PORT`      | no          | Puerto (Railway lo inyecta automáticamente; default 3000 en local)            |
| `STATE_KEY` | no          | Llave Redis donde se guarda el estado (default `elsistema:v9:estado`)         |
| `HTML_FILE` | no          | Nombre del HTML a servir (default `el_sistema_v9.html`)                       |

Sin `REDIS_URL` la app corre pero el estado no persiste entre reinicios (útil solo para desarrollo local).

## Endpoints

- `GET /` — sirve el HTML de la app
- `GET /api/estado` — devuelve el estado actual `{items, tiktok}`
- `POST /api/estado` — guarda el estado (body: `{items, tiktok}`)
- `GET /api/estado/backup` — descarga el estado como JSON
- `GET /health` — healthcheck (útil para Railway)

## Deploy en Railway

1. `git init && git add . && git commit -m "v9"`
2. `git push` al repo `albertocruz/el-sistema`
3. En Railway:
   - Asegúrate de tener un servicio Redis linkeado y `REDIS_URL` apuntando a él
   - El build debería detectar Node.js automáticamente (`npm install` y `npm start`)
4. El healthcheck path sugerido es `/health`

## Estructura del estado

```json
{
  "items": {
    "<item_id>": {
      "pleca": "...",
      "status": "En preparación",
      "platform_status": {"igfb":"publicado","linkedin":"publicado"},
      "hero_clip": {"ep_id":"100","clip_num":5},
      "fecha_efectiva": "2026-04-23",
      "observaciones": "..."
    }
  },
  "tiktok": {
    "2026-04-20_manana": {"ep_id":"100","clip_num":3},
    "2026-04-20_manana__published": true,
    "2026-04-20_noche": {"ep_id":"101","clip_num":7}
  }
}
```

Solo se guardan overrides respecto a los datos base embebidos en el HTML. El HTML es fuente de verdad para el catálogo (164 items, 9 invitados, 284 clips TikTok, copys por pieza). El estado es solo la capa dinámica.

## Si necesitas regenerar el HTML

El HTML tiene los 6 JSON codificados en base64 dentro de `<script type="text/plain" id="data-...">`. Para regenerar con data nueva:

1. Actualiza los JSON (`V9_ITEMS_164.json`, `V9_CLIP_BANK.json`, etc.)
2. Codifica cada uno a base64 y reemplaza el contenido del script correspondiente
3. O usa el builder (`build.py`) del proyecto

## Roles

- **Alberto** y **Agustín**: acceso completo (todas las vistas, editar todo, TikTok)
- **Erick · Ximena**: solo items de video (+ TikTok)
- **Zara · Karla**: solo items estáticos

Los roles se cambian desde la esquina superior derecha. El rol no se persiste — cada sesión empieza en Alberto.

## Vistas

1. **Hoy** — Hoy + próximos 7 días + días 8–14
2. **Semana** — Pills S1–S15, piezas agrupadas por día
3. **Historial** — Fechas pasadas
4. **Pendientes** — Agrupado por plataforma (IG/FB, LinkedIn, TikTok, YT Shorts)
5. **Todo** — Todo el catálogo ordenado por fecha
6. **LDM TikTok** — Calendario de 30 días desde 20 abr, slots mañana/noche, un invitado no se repite el mismo día

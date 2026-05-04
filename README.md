# El Sistema v10

**Básico.fm · Los Dioses del Marketing · Genio.soy**

---

## Qué cambió de v9 a v10

Los datos ya no viven dentro del HTML. Ahora están en archivos JSON separados en la carpeta `data/`. Esto significa:

- Actualizar un copy = editar un JSON → commit → push → listo.
- El HTML carga los datos al abrirse (fetch al servidor).
- El editor visual (`/editor`) te permite editar copys y reprogramar fechas sin tocar archivos.

---

## Estructura de archivos

```
el-sistema/
├── el_sistema_v10.html    ← App principal (Básico.fm)
├── editor.html            ← Editor de copy y fechas
├── server.js              ← Servidor Express
├── package.json
├── data/
│   ├── basico_items.json  ← 76 piezas de Básico con thumbnails
│   └── basico_copy.json   ← Copys por plataforma (keyed por item id)
└── README.md
```

---

## Flujo de trabajo diario

### Editar un copy

1. Abre `el-sistema-production.up.railway.app/editor`
2. Pestaña **Copy**
3. Busca la pieza por formato, productor o semana
4. Edita el texto directamente en el campo
5. Cuando termines → botón **↓ Descargar copy** → te baja `basico_copy.json`
6. Abre GitHub Desktop → arrastra el archivo a la carpeta `data/` del repo (reemplaza el existente)
7. GitHub Desktop detecta el cambio → escribe un mensaje de commit → **Commit to main** → **Push origin**
8. Railway redespliega automáticamente en ~60 segundos

### Reprogramar fechas

1. Abre `/editor` → pestaña **Reprogramar**
2. Elige filtros: formato, productor, semana
3. Elige cuántas semanas mover y en qué dirección
4. Botón **Vista previa** → revisa las fechas antes de aplicar
5. Botón **Aplicar cambios**
6. Botón **↓ Descargar items** → te baja `basico_items.json`
7. Sube al repo y push (mismo proceso que arriba)

### Agregar thumbnail a una pieza sin thumbnail

Misma pantalla del editor → pestaña **Thumbnail** dentro de cada pieza → escribe el texto → descarga → push.

---

## Indicadores en el editor

| Indicador | Qué significa |
|-----------|---------------|
| ⚠ basura detectada | El copy tiene instrucciones del prompt coladas (limpiar antes de publicar) |
| Punto verde en la card | La pieza ya tiene copy disponible |
| Punto gris en la card | La pieza está sin copy aún |

---

## Agregar una pieza nueva (manual)

Abre `data/basico_items.json` → al final del arreglo agrega un objeto siguiendo esta estructura:

```json
{
  "id": "2026-07-07_BASICO_Video_Alberto_G17",
  "fecha": "2026-07-07",
  "fecha_display": "Mar 7 Jul",
  "semana": "S16",
  "marca": "Básico.fm",
  "marca_short": "BASICO",
  "formato": "Video Alberto",
  "titulo": "Título del video",
  "pleca": "PLECA EN MAYÚSCULAS",
  "thumbnail": "Texto del thumbnail.",
  "plataformas": "IG/FB · LinkedIn · YT Shorts · TikTok",
  "es_video": true,
  "es_estatico": false,
  "necesita_thumb": true,
  "copy_status": "sin_copy",
  "copy": {},
  "status": "Listo",
  "quien_produce": "Alberto",
  "hero_clips": [],
  "observaciones": "",
  "pauta": false,
  "id_pieza": "G17"
}
```

Guarda → commit → push.

---

## Variables de entorno en Railway

| Variable | Valor |
|----------|-------|
| `REDIS_URL` | URL de tu instancia Redis |
| `PORT` | Railway lo asigna automáticamente |

---

## URLs

| URL | Qué es |
|-----|--------|
| `/` | App principal |
| `/editor` | Editor de copy y fechas |
| `/api/data` | Lista de archivos JSON disponibles |
| `/api/data/basico_items` | Items de Básico |
| `/api/data/basico_copy` | Copy de Básico |

---

## Estado de thumbnails

- ✅ Video Alberto (G01–G16): completo
- ✅ Video Fernanda T1 (G01–G15): completo
- ✅ Video Fernanda T2 (G01–G11): completo
- ⏳ Video Agustín (G01–G11): pendiente (copys no incluyen THUMBNAIL)
- ⏳ Video Alberto T2 (AC01–AC11): pendiente (copys no incluyen THUMBNAIL)

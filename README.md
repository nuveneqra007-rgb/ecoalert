# 🌱 EcoAlert Web — React + Vite

Panel de administración web que se conecta al backend real.

## 🚀 Inicio rápido

```bash
# 1. Instalar dependencias
cd web
npm install

# 2. Iniciar en desarrollo (requiere backend corriendo en :3000)
npm run dev
# → http://localhost:5173
```

## 📁 Estructura

```
src/
├── context/AuthContext.jsx   ← Auth global + JWT + refresh
├── services/api.js           ← Axios + auto-refresh interceptor
├── hooks/useToast.js
├── components/
│   ├── Layout.jsx            ← Sidebar con navegación
│   └── UI.jsx                ← Button, Card, Badge, etc.
└── pages/
    ├── Login.jsx             ← POST /api/auth/login
    ├── Register.jsx          ← POST /api/auth/register
    ├── Dashboard.jsx         ← GET /api/reports + stats
    ├── Reports.jsx           ← Lista con filtros y búsqueda
    ├── ReportDetail.jsx      ← Detalle + mini mapa Leaflet
    ├── NewReport.jsx         ← Formulario + GPS + IA detection
    ├── MapPage.jsx           ← Leaflet map con markers reales
    ├── AdminPanel.jsx        ← Gestión usuarios + estado IA
    └── Profile.jsx
```

## 🔌 Conexión al backend

El proxy en `vite.config.js` redirige `/api/*` → `http://localhost:3000/api/*`.

En producción, actualiza `.env`:
```
VITE_API_URL=https://tu-backend.onrender.com/api
```

## 🤖 Flujo completo con IA

1. Usuario sube foto en `/reports/new`
2. Clic en **"Detectar basura con IA"**
3. Se llama a `POST /api/ai/detect-trash`
4. Backend analiza con **OpenAI GPT-4o Vision**
5. Si hay basura → muestra tipo y confianza
6. Usuario completa dirección (o usa GPS automático)
7. Envía reporte → aparece en Dashboard + Mapa

## 🗺️ Mapa

Usa **Leaflet + OpenStreetMap** (gratis, sin API key).
Los marcadores se colorean por estado:
- 🔴 Pendiente
- 🟡 En proceso  
- 🟢 Resuelto

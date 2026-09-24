# FarmaciaUnipoli
Plataforma médica web para agendar citas con especialistas, gestionar consultas y emitir recetas digitales — con notificaciones por WhatsApp y catálogo de medicamentos.
# Enfermeria Unipoli

Plataforma médica desarrollada con Node.js, Express y Firebase que permite a pacientes encontrar médicos especializados, agendar citas en línea y recibir confirmaciones automáticas por WhatsApp.

## Características

- Búsqueda de médicos por especialidad y ciudad
- Agendamiento de citas con slots de disponibilidad
- Confirmaciones y recordatorios automáticos vía WhatsApp
- Panel del médico para gestionar citas y emitir recetas digitales
- Catálogo de medicamentos conectado a API REST (FastAPI)
- Panel de administración para gestión de médicos
- Mapa interactivo con ubicación de consultorios (Leaflet)

## Stack

- **Backend:** Node.js + Express + Handlebars
- **Base de datos:** Firebase Firestore + Firebase Auth
- **API de medicamentos:** FastAPI (Python)
- **Notificaciones:** WhatsApp Cloud API (Meta)
- **Mapas:** Leaflet.js + OpenStreetMap + Geoapify

## Instalación

```bash
npm install
node server.js
```

Requiere archivo `.env` con credenciales de Firebase y WhatsApp.

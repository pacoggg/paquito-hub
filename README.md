# 🧠 Paquito Hub

Dashboard de administración con IA local, control de OpenClaw y monitorización del sistema.

## 🚀 Despliegue Rápido

```bash
git clone <repo-url>
cd paquito-hub
docker compose up -d
```

Accede a: **http://localhost:3000**

## 🛠️ Desarrollo Local

```bash
cp .env.example .env
npm install
npm run dev
```

## 📦 Stack

| Componente | Tecnología |
|---|---|
| Frontend | HTML + CSS + JS (Glassmorphism) |
| Backend | Node.js + Express |
| IA | Ollama (phi3) |
| Deploy | Docker Compose |

## 🔧 API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/status` | Health check |
| GET | `/api/system-info` | Info agregada del sistema |
| POST | `/api/action` | Ejecutar acción |
| GET | `/api/openclaw/status` | Estado OpenClaw |
| POST | `/api/openclaw/restart` | Reiniciar OpenClaw |
| GET | `/api/openclaw/logs` | Logs OpenClaw |
| POST | `/api/ollama/chat` | Chat con IA |
| GET | `/api/ollama/models` | Modelos disponibles |

## 📜 Acciones Disponibles

`check_openclaw` · `restart_openclaw` · `logs_openclaw` · `check_dns` · `check_containers` · `check_disk` · `check_ram` · `check_ollama`

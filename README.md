# 🧠 Paquito Hub

Dashboard de administración con IA local, control de OpenClaw y monitorización del sistema.

## 🚀 Instalación Rápida (Producción)

Si estás desplegando desde cero en **CT 102**, simplemente clona y ejecuta el instalador que automatiza todo (SSH, dependencias y Docker):

```bash
git clone https://github.com/pacoggg/paquito-hub.git
cd paquito-hub
chmod +x install.sh
./install.sh
```

Accede a: **http://localhost:3000**

## 🏗️ Arquitectura (CT 102 -> CT 103)

- **El Hub** se ejecuta en el contenedor local (`CT 102`) en Docker.
- **Paquito / OpenClaw** se ejecuta en un host remoto (`CT 103` con IP `192.168.1.146`).
- El acceso remoto se realiza por **SSH** directamente desde el contenedor de Paquito Hub.
- **Importante:** Las claves SSH privadas se autogeneran en la carpeta `ssh/` y no se suben al repositorio.
- **Ollama** está configurado para conectarse a `http://192.168.1.146:11434`, asegúrate de que Ollama esté instalado y expuesto.

## 🛠️ Comprobaciones y Troubleshooting

Para verificar el estado del sistema, utiliza estos comandos:

```bash
# Ver estado de los contenedores
docker ps

# Ver logs del Hub
docker logs -f paquito-hub

# Verificar si el Hub está levantado
curl http://localhost:3000/api/status

# Verificar que el contenedor puede conectar al CT 103 por SSH
docker exec -it paquito-hub ssh root@192.168.1.146 "hostname"
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

# Paquito Hub

Dashboard privado para controlar CT 102, CT 103 Paquito/OpenClaw y host Proxmox mediante acciones seguras por allowlist y SSH.

## Arquitectura

- **CT 102 server-web:** ejecuta Docker y Paquito Hub.
- **CT 103 paquito:** ejecuta OpenClaw.
- **Proxmox host:** 192.168.1.135.

## Instalación Rápida

```bash
git clone https://github.com/pacoggg/paquito-hub.git
cd paquito-hub
chmod +x install.sh
./install.sh
```

## Comprobaciones

```bash
docker ps
docker logs -f paquito-hub
curl http://localhost:3000/api/status
docker exec -it paquito-hub ssh root@192.168.1.146 "hostname"
docker exec -it paquito-hub ssh root@192.168.1.135 "hostname"
```

## Notas Importantes

- Requiere acceso SSH sin contraseña desde CT 102 hacia CT 103 y Proxmox.
- No subir claves privadas.
- Ollama está preparado pero actualmente es opcional.
- OpenClaw se controla de momento por SSH/scripts.

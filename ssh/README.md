# Claves SSH para Paquito Hub

Esta carpeta se monta como volumen en el contenedor Docker para permitir el acceso SSH remoto al CT 103 (Paquito).

**IMPORTANTE:**
Los archivos `id_ed25519` (clave privada) y `known_hosts` se guardarán aquí, pero **NUNCA** deben subirse al repositorio. El archivo `.gitignore` ya los excluye.

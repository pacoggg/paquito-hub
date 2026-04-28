#!/bin/bash
# ============================================================
# Paquito Hub — Fast Local LLM Installer
# Instala Qwen2.5-0.5B en CT 103 con llama.cpp
# Idempotente: solo descarga/compila lo que falte
# ============================================================

set -e

MODEL_DIR="/root/models"
MODEL_FILE="qwen2.5-0.5b-instruct-q4_k_m.gguf"
MODEL_PATH="${MODEL_DIR}/${MODEL_FILE}"
MODEL_URL="https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf"
LLAMA_DIR="/root/llama.cpp"
SERVICE_FILE="/etc/systemd/system/llama-server.service"
NPROC=$(nproc)

echo "============================================================"
echo "🧠 Paquito Hub — Fast LLM Installer (Qwen 0.5B)"
echo "============================================================"

# ── 1. Create model directory ──
echo "[1/5] Preparando directorio de modelos..."
mkdir -p "$MODEL_DIR"

# ── 2. Download model (idempotent) ──
if [ -f "$MODEL_PATH" ]; then
    echo "[2/5] ✅ Modelo ya descargado: $MODEL_FILE"
else
    echo "[2/5] 📥 Descargando modelo $MODEL_FILE..."
    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "$MODEL_PATH" "$MODEL_URL"
    elif command -v curl &> /dev/null; then
        curl -L -o "$MODEL_PATH" "$MODEL_URL"
    else
        echo "[!] Error: ni wget ni curl están disponibles"
        exit 1
    fi

    if [ -f "$MODEL_PATH" ]; then
        SIZE=$(du -h "$MODEL_PATH" | cut -f1)
        echo "[2/5] ✅ Modelo descargado: $SIZE"
    else
        echo "[!] Error: la descarga falló"
        exit 1
    fi
fi

# ── 3. Compile llama.cpp (idempotent) ──
if [ -f "${LLAMA_DIR}/build/bin/llama-server" ]; then
    echo "[3/5] ✅ llama.cpp ya compilado (cmake build)"
    LLAMA_SERVER="${LLAMA_DIR}/build/bin/llama-server"
elif [ -f "${LLAMA_DIR}/llama-server" ]; then
    echo "[3/5] ✅ llama.cpp ya compilado (make build)"
    LLAMA_SERVER="${LLAMA_DIR}/llama-server"
elif [ -f "${LLAMA_DIR}/server" ]; then
    echo "[3/5] ✅ llama.cpp ya compilado (legacy)"
    LLAMA_SERVER="${LLAMA_DIR}/server"
else
    echo "[3/5] 🔧 Compilando llama.cpp..."

    # Install build dependencies if missing
    if ! command -v make &> /dev/null || ! command -v g++ &> /dev/null; then
        apt-get update -qq && apt-get install -y -qq build-essential git cmake > /dev/null 2>&1
    fi

    if [ ! -d "$LLAMA_DIR" ]; then
        git clone --depth 1 https://github.com/ggerganov/llama.cpp.git "$LLAMA_DIR"
    fi

    cd "$LLAMA_DIR"

    # Try cmake build first (modern), fallback to make
    if command -v cmake &> /dev/null; then
        mkdir -p build && cd build
        cmake .. -DGGML_CUDA=OFF > /dev/null 2>&1
        cmake --build . --config Release -j${NPROC} > /dev/null 2>&1
        cd ..
        if [ -f "build/bin/llama-server" ]; then
            LLAMA_SERVER="${LLAMA_DIR}/build/bin/llama-server"
        else
            echo "[!] cmake build failed, trying make..."
            make -j${NPROC} server > /dev/null 2>&1
            LLAMA_SERVER="${LLAMA_DIR}/server"
        fi
    else
        make -j${NPROC} server > /dev/null 2>&1
        LLAMA_SERVER="${LLAMA_DIR}/server"
    fi

    if [ -f "$LLAMA_SERVER" ]; then
        echo "[3/5] ✅ llama.cpp compilado: $LLAMA_SERVER"
    else
        echo "[!] Error: no se pudo compilar llama.cpp"
        exit 1
    fi
fi

# ── 4. Create/update systemd service ──
echo "[4/5] 📋 Configurando servicio systemd..."

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=llama.cpp Server (Qwen 0.5B Fast)
After=network.target

[Service]
Type=simple
ExecStart=${LLAMA_SERVER} \\
  -m ${MODEL_PATH} \\
  --host 0.0.0.0 \\
  --port 8080 \\
  -c 1024 \\
  -n -1 \\
  -t ${NPROC}
Restart=on-failure
RestartSec=5
WorkingDirectory=/root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable llama-server > /dev/null 2>&1
systemctl restart llama-server

echo "[4/5] ✅ Servicio llama-server activado y reiniciado"

# ── 5. Verify ──
echo "[5/5] 🔍 Verificando servicio (espera 5s)..."
sleep 5

if curl -s --max-time 5 http://localhost:8080/v1/models | grep -q "model"; then
    echo "[5/5] ✅ llama.cpp respondiendo correctamente"
    curl -s http://localhost:8080/v1/models | head -c 200
    echo ""
else
    echo "[!] Advertencia: llama.cpp no responde aún."
    echo "[!] Revisa: journalctl -u llama-server -n 20"
fi

echo ""
echo "============================================================"
echo "🚀 LLM Fast instalado correctamente"
echo "   Modelo: $MODEL_FILE"
echo "   Server: $LLAMA_SERVER"
echo "   Endpoint: http://0.0.0.0:8080/v1/chat/completions"
echo "============================================================"

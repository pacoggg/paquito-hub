#!/bin/bash
ssh root@192.168.1.146 "tail -n 80 /tmp/openclaw/*.log 2>/dev/null || echo 'Sin logs de OpenClaw'"

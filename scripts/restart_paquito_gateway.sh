#!/bin/bash
ssh root@192.168.1.146 "pkill -f 'openclaw gateway' || true; sleep 2; nohup openclaw gateway >/tmp/openclaw/gateway-manual.log 2>&1 & echo 'Gateway OpenClaw relanzado'"

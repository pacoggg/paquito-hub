#!/bin/bash
ssh root@192.168.1.146 "hostname && pgrep -af openclaw || echo 'OpenClaw no detectado'"

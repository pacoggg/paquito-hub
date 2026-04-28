#!/bin/bash
ssh root@192.168.1.146 "pgrep -af openclaw || echo 'OpenClaw no detectado'"

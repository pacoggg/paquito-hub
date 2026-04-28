#!/bin/bash
ssh root@192.168.1.135 "pct list && echo '--- VMs QEMU ---' && qm list"

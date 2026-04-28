#!/bin/bash
ssh root@192.168.1.135 "df -h && echo '--- PVE storage ---' && pvesm status"

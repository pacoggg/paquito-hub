#!/bin/bash
ssh root@192.168.1.146 "cat /etc/resolv.conf && getent hosts google.com"

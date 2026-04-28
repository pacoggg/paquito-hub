#!/bin/bash
ssh root@192.168.1.146 "echo '--- resolv.conf ---'; cat /etc/resolv.conf; echo '--- DNS test ---'; getent hosts google.com || echo 'DNS falló en Paquito'"

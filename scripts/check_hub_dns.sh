#!/bin/bash
getent hosts google.com || echo "DNS falló"

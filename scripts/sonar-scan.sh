#!/bin/bash

set -euo pipefail

npx '@sonar/scan' -Dsonar.host.url="${SONAR_HOST_URL}" -Dsonar.token="${SONAR_TOKEN}"

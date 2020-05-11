#!/bin/sh
set -e

echo "./pre-push.sh" > .git/hooks/pre-push
chmod +x .git/hooks/pre-push

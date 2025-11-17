#!/bin/bash
# Попытка найти и установить зависимости

# Проверяем разные пути к npm
PATHS=(
  "/usr/local/bin/npm"
  "/opt/homebrew/bin/npm"
  "$HOME/.nvm/versions/node/*/bin/npm"
  "/usr/bin/npm"
  "npm"
)

for path in "${PATHS[@]}"; do
  if command -v "$path" &> /dev/null; then
    echo "Найден npm: $path"
    "$path" install
    exit 0
  fi
done

echo "npm не найден. Пожалуйста, установите Node.js и npm вручную."
echo "Скачайте с https://nodejs.org/"
exit 1

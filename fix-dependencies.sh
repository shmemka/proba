#!/bin/bash
echo "=== Установка зависимостей ==="
echo ""
echo "Попытка найти npm..."

# Проверяем разные варианты
if command -v npm &> /dev/null; then
    echo "✓ npm найден!"
    npm install
    exit 0
fi

# Проверяем через nvm
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "Найден nvm, загружаю..."
    source "$HOME/.nvm/nvm.sh"
    if command -v npm &> /dev/null; then
        echo "✓ npm найден через nvm!"
        npm install
        exit 0
    fi
fi

# Проверяем стандартные пути
for path in /usr/local/bin/npm /opt/homebrew/bin/npm; do
    if [ -f "$path" ]; then
        echo "✓ npm найден: $path"
        "$path" install
        exit 0
    fi
done

echo ""
echo "❌ npm не найден!"
echo ""
echo "Пожалуйста, выполните одно из следующих действий:"
echo ""
echo "1. Установите Node.js с https://nodejs.org/"
echo "2. Или используйте Homebrew: brew install node"
echo "3. После установки запустите: npm install"
echo ""
exit 1

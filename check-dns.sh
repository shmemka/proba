#!/bin/bash

echo "🔍 Проверка DNS настроек для вашего домена"
echo "=========================================="
echo ""

# Запрашиваем домен
read -p "Введите ваш домен (например: example.ru): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Домен не указан"
    exit 1
fi

echo ""
echo "📋 Проверка DNS записей для $DOMAIN и www.$DOMAIN"
echo ""

# Проверяем A записи
echo "1️⃣ A-записи:"
dig +short $DOMAIN A
dig +short www.$DOMAIN A

echo ""
echo "2️⃣ CNAME записи:"
dig +short www.$DOMAIN CNAME

echo ""
echo "3️⃣ NS записи (DNS серверы):"
dig +short $DOMAIN NS

echo ""
echo "4️⃣ Проверка доступности:"
curl -I -s https://$DOMAIN | head -1
curl -I -s https://www.$DOMAIN | head -1

echo ""
echo "✅ Проверка завершена"

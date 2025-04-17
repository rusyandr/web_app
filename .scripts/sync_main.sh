#!/bin/bash

# Названия веток, которые нужно синхронизировать с main
TARGET_BRANCHES=("rusyandr" "cht-h" "farehet")

# Убедимся, что мы на main и он актуален
git checkout main
git pull origin main

# Перебираем ветки и мёржим main в каждую
for branch in "${TARGET_BRANCHES[@]}"
do
  echo "===> Синхронизируем ветку '$branch' с main"

  # Переключаемся
  git checkout "$branch"

  # Подтягиваем свежак, если надо
  git pull origin "$branch"

  # Мёржим main
  git merge main -m "Auto-merge from main into $branch"

  # Пушим изменения (если merge прошёл успешно)
  git push origin "$branch"
done

# Возвращаемся на main в конце
git checkout main

echo "Все ветки синхронизированы с main!"

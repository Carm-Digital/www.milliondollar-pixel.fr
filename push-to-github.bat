@echo off
cd /d "%~dp0"

git init 2>nul
git add .
git status
git commit -m "first commit" 2>nul || git commit -m "first commit" --allow-empty
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/aleerzarzis1/www.milliondollar-pixel.fr.git
git push -u origin main

pause

@echo off
echo Pushing code to GAS...
clasp push

echo.
echo Updating existing deployment...
clasp deploy -i AKfycbwSKL2A_qLer-jDTiLU1gMKTIPrTWeaXcujOd8Y5Dc -d "Update %date% %time%"

echo.
echo Deployment complete!
pause

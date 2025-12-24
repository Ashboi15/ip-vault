@echo off
echo Starting IP Vault Project...

echo Starting Backend...
start cmd /k "cd backend && npm install && npm start"

echo Starting Frontend...
start cmd /k "cd client && npm install && npm start"

echo Setting up Blockchain...
cd contracts
call npm install
echo.
echo Deploying Contract...
echo NOTE: Make sure to run 'npx hardhat node' in a separate terminal if you haven't!
echo.
call npx hardhat compile
call npx hardhat run scripts/deploy.js --network localhost

echo.
echo Project Started!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
pause

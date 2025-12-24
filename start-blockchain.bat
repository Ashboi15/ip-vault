@echo on
title IP Vault Blockchain - DEBUG MODE
cd /d "%~dp0\contracts"

echo Current Directory: %CD%
echo Listing node_modules contents to verify hardhat installation...

if not exist node_modules (
    echo node_modules not found. Installing dependencies...
    call npm install
)

if not exist node_modules\.bin\hardhat.cmd (
    echo ERROR: Harhat binary not found!
    echo Re-installing Hardhat...
    call npm install --save-dev hardhat
)

echo.
echo Starting Hardhat Node...
call .\node_modules\.bin\hardhat.cmd node

echo.
echo ==============================================
echo WORKER CRASHED OR STOPPED. SEE ERROR ABOVE.
echo ==============================================
pause

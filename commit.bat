@echo off
setlocal enabledelayedexpansion

:: Combine all arguments into a single message
set "msg="
:loop
if not "%~1"=="" (
    if defined msg (
        set "msg=!msg! %~1"
    ) else (
        set "msg=%~1"
    )
    shift
    goto loop
)

:: If no message provided, use date and time
if "!msg!"=="" (
    for /f "tokens=1-4 delims=/ " %%a in ("%date%") do (
        set "msg=Commit %%d-%%b-%%c %%a %time%"
    )
)

git add -A
git commit -m "!msg!"
git push
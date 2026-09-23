@echo off
setlocal
cd /d "%~dp0"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo This folder is not a Git repository.
  goto :failed
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo No GitHub remote named origin is configured.
  echo Configure it with: git remote add origin YOUR_GITHUB_REPOSITORY_URL
  goto :failed
)

for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not defined BRANCH (
  echo Could not determine the current branch.
  goto :failed
)

echo Current branch: %BRANCH%
echo Files currently changed:
git status --short
echo.
set /p "CONFIRM=Stage all non-ignored changes, commit, and push? (Y/N): "
if /I not "%CONFIRM%"=="Y" goto :cancelled

git add -A
if errorlevel 1 goto :failed

git diff --cached --quiet
if not errorlevel 1 (
  echo There are no changes to commit.
  goto :done
)

set /p "MESSAGE=Commit message (press Enter for 'Save project files'): "
if not defined MESSAGE set "MESSAGE=Save project files"

git commit -m "%MESSAGE%"
if errorlevel 1 goto :failed

git push -u origin "%BRANCH%"
if errorlevel 1 goto :failed

echo.
echo Successfully pushed to origin/%BRANCH%.
goto :done

:cancelled
echo Cancelled. No files were staged or committed.
goto :done

:failed
echo.
echo Save failed. Read the Git message above, fix the issue, and run this file again.
pause
exit /b 1

:done
echo.
pause
exit /b 0

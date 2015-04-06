:: Packing Instruction
::
:: Work for:
:: * Scrapbook versions using chrome/scrapbook.jar
::   e.g. ScrapBook <= 1.4.8, ScrapBook Plus <= 1.9.24.40b3 
::
:: System requirements:
:: * 7z
::
:: Steps:
:: * Place this packing script in the main project folder.
:: * Adjust %filename% and %compressor% variables to fit your needs.
:: * Run this script, and the .xpi file is created in the same directory.
::
:: You could add /*.cmd and /*.xpi to the .git/info/exclude file to prevent being scanned by git.
::
@echo off
set "filename=firefox-scrapbookx.xpi"
set "compressor=C:\Program Files\7-Zip\7z.exe"
set "dir=%~dp0"
set "dir=%dir:~0,-1%"

del "%dir%\%filename%"
"%compressor%" a -tzip -mx9 "%dir%\chrome\scrapbook.jar" "%dir%\chrome\*"
"%compressor%" a -tzip -mx9 "%dir%\%filename%" -r *.jar
"%compressor%" a -tzip -mx9 "%dir%\%filename%" *.* -r -x!.git\ -x!*.cmd -x!*.xpi -x!chrome\
del "%dir%\chrome\scrapbook.jar"

pause
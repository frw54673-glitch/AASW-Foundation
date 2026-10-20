@echo off
"%~dp0.local-mysql\binaries\9.7.2\mysql\bin\mysqld.exe" --no-defaults --port=3306 --datadir="%~dp0.local-mysql\data" --bind-address=127.0.0.1 --default-time-zone=+00:00 --console
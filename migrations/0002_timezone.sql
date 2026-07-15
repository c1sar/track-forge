-- Zona horaria IANA preferida por el usuario (override del navegador).
-- NULL => usar la zona detectada en el cliente.
ALTER TABLE users ADD COLUMN timezone TEXT;

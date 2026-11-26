# Changelog

Todos los cambios relevantes de SIGR se documentan en este archivo siguiendo Semantic Versioning.

## [1.1.0] - 2026-11-25

### Agregado

- Inicio y cierre de sesión con usuario y contraseña.
- Cambio de usuario y contraseña desde Configuración con validación de la clave actual.
- Hash bcrypt, sesiones firmadas, cookies seguras y límite de intentos.
- Tabla `usuarios` en Supabase con Row Level Security.
- Pipeline CI/CD en GitHub Actions con build, lint, pruebas, auditoría, deploy y smoke test.
- Pruebas automatizadas de autenticación, ventas, stock y contabilidad.
- Scripts de build y validación posterior al despliegue.
- Documentación técnica del pipeline y manual actualizado.

### Corregido

- Las rutas operativas de la API ahora requieren una sesión válida.
- Los datos y credenciales locales quedan excluidos del control de versiones.

## [1.0.0] - 2026-11-25

### Agregado

- Línea base de SIGR con dashboard, POS, inventario, clientes, contabilidad, reportes y Supabase.

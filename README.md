# Clubes Escolares 2026 – DRELM · Versión 4

## Novedades
- Nuevo módulo **Detalle de clubes**: una fila por cada club, con exportación a Excel.
- Filtro **REI** integrado mediante código local usando `Redes Educativas.xlsx`.
- Identificación de **Núcleo REI**.
- **Fecha de corte visible** en cabecera y pie.
- `ACTUALIZAR_TABLERO.bat` pregunta la fecha de corte en cada actualización y la recuerda para el siguiente corte.
- El reporte público excluye DNI, teléfono y correo.

## Actualización
1. Coloque el Excel principal de Clubes Escolares en `input`.
2. Mantenga `input/Redes Educativas.xlsx` para el cruce REI.
3. Haga doble clic en `ACTUALIZAR_TABLERO.bat`.
4. Escriba la fecha de corte o presione Enter para conservar la anterior.
5. Confirme con S.
6. El BAT genera los JSON, crea commit y hace push.

## URL
https://lisidro11.github.io/clubes-escolares-drelm/

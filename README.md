# Clubes Escolares 2026 - versión con Informe Técnico

Incluye:
- gráficos con cantidad y porcentaje;
- comparaciones Sí/No mediante barras apiladas;
- UGEL en orden 01 a 07;
- nombre del Director sin teléfono/correo/DNI;
- informe técnico PDF descargable desde el tablero;
- análisis independiente de Director y Docente Asesor.

## Ejecutar
```cmd
python -m http.server 8000 -d public
```
Abrir http://localhost:8000 y presionar Ctrl+F5.

## Informe técnico
`public/documentos/Informe_Tecnico_Clubes_Escolares_2026.pdf`


## Versión 2 - gráficos N + %
- Cache-busting en CSS/JS para evitar que Chrome conserve la versión anterior.
- Barras Sí/No apiladas con cantidad y porcentaje.
- Sección 4 resumida con comparación horizontal Sí/No.
- Modalidad, gestión, UGEL y áreas muestran N y %.
- Docente asesor incorpora gráfico 4.1–4.8 con N y %.


## Versión 3 - diseño alineado con las fichas oficiales
- Sección 3 sigue la lógica condicional de la Ficha del Director.
- El gráfico por UGEL usa barras 100% apiladas para comparar porcentajes sin que el tamaño de muestra de una UGEL distorsione la lectura.
- Cuando 3.2 = Sí se presenta un bloque específico con el perfil de los clubes implementados.
- Cuando 3.2 = No se muestra la ruta 3.3 y 3.4; actualmente sin dato porque esos campos no están en la exportación.
- En la Ficha del Director, la gestión se alinea a 4.1–4.7; liderazgo estudiantil se analiza en la sección de clubes.
- La Ficha del Docente Asesor se alinea a 4.1–4.9.

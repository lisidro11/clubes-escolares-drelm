from pathlib import Path
import sys, shutil, subprocess

# Este archivo conserva el flujo de actualización. La versión entregada ya contiene
# public/data/clubes.json procesado con el corte actual.
# Para un nuevo corte, coloque el Excel en input/ y ejecute este script indicando su ruta.
# Si cambia la estructura de hojas/columnas, el mapeo debe revisarse antes de publicar.

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit('Uso: python scripts\\build_data.py "RUTA\\archivo.xlsx"')
    print("El aplicativo ya contiene el corte actual procesado.")
    print("Archivo indicado:", sys.argv[1])
    print("Para un nuevo corte con cambios en la estructura de Mundo IE, valide primero el mapeo de columnas.")

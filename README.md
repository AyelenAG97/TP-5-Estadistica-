# TP5 – Relación entre variables

Trabajo Práctico Nº 5 de **Estadística y Probabilidades**
Tecnicatura Superior en Desarrollo de Software – Instituto IDRA, Mar del Plata (2026)

Página web que consume una API con JavaScript y calcula el **coeficiente de correlación de Pearson** entre todas las combinaciones de cuatro variables meteorológicas. Cada par se muestra en una card con su valor de _r_, un **gráfico de dispersión** y una breve descripción del resultado. Al final se indica qué par tiene la mayor correlación y qué podría implicar.

---

## Integrantes

- Matias Rosa
- Camila Larsen
- Ayelen Aguero
- Matias Nerli

---

## Funcionalidades

- Consulta la API al abrir la página; el botón **Recargar datos** vuelve a pedirlos.
- Cálculo de Pearson para los 6 pares:
    - Presión y Temperatura
    - Presión y Humedad
    - Presión y Velocidad del viento
    - Temperatura y Humedad
    - Temperatura y Velocidad del viento
    - Humedad y Velocidad del viento
- Una card por par con:
    - el valor de _r_ y una etiqueta con su dirección y fuerza;
    - gráfico de dispersión con Chart.js y la recta de regresión;
    - descripción automática que analiza el valor obtenido.
- El color de cada card indica la fuerza: **rojo** fuerte, **naranja** moderada, **gris** débil.
- Conclusión con el par de mayor correlación y un ranking de los 6 pares por |r|.
- Tabla con los datos crudos de la API.
- Manejo de errores si la API no responde o devuelve datos inválidos.

---

## API

Los datos se piden por GET a:

```text
https://apidemo.geoeducacion.com.ar/api/testing/pearson/1
```

Devuelve 10 registros con `presion` (hPa), `temperatura` (°C), `humedad` (%) y `viento` (km/h) dentro de `data[0].valores`.

---

## Fórmulas

Coeficiente de Pearson:

```text
          Σ (xi − x̄)(yi − ȳ)
r = ───────────────────────────────
     √( Σ (xi − x̄)² · Σ (yi − ȳ)² )
```

Recta de regresión (mínimos cuadrados), que se dibuja sobre cada dispersión:

```text
b = Σ (xi − x̄)(yi − ȳ) / Σ (xi − x̄)²
a = ȳ − b·x̄
y = a + b·x
```

Criterio usado para clasificar la fuerza de la correlación:

| \|r\|        | Correlación      |
| ------------ | ---------------- |
| ≥ 0,9        | Muy fuerte       |
| 0,7 – 0,9    | Fuerte           |
| 0,4 – 0,7    | Moderada         |
| 0,2 – 0,4    | Débil            |
| < 0,2        | Muy débil o nula |

---

## Resultados

| Par                          | r       | Correlación        |
| ---------------------------- | ------- | ------------------ |
| Temperatura y Viento         | −0,7368 | Negativa fuerte    |
| Presión y Temperatura        | 0,7043  | Positiva fuerte    |
| Presión y Viento             | −0,5552 | Negativa moderada  |
| Humedad y Viento             | 0,4640  | Positiva moderada  |
| Temperatura y Humedad        | −0,4506 | Negativa moderada  |
| Presión y Humedad            | −0,3730 | Negativa débil     |

**Conclusión:** el par con mayor correlación es **Temperatura y Velocidad del viento** (r ≈ −0,74), una correlación negativa fuerte: los días más cálidos tienden a tener menos viento. Esto es coherente con la segunda correlación más fuerte (Presión y Temperatura, r ≈ 0,70): los días de alta presión suelen ser estables, calmos y más cálidos, mientras que el viento suele acompañar a los frentes fríos. Con solo 10 mediciones el resultado es orientativo, y correlación no implica causalidad.

---

## Tecnologías

- **HTML5**: estructura de la página.
- **CSS3**: diseño de las cards, la conclusión y la tabla, con variables CSS, grid y diseño adaptable a celulares.
- **JavaScript**: `fetch` con `async/await` para consumir la API, cálculos estadísticos y manipulación del DOM.
- **[Chart.js 4](https://www.chartjs.org/)**: gráficos de dispersión.

---

## Estructura

```text
├── index.html          → Estructura de la página
├── main.js             → Consumo de la API, cálculo de Pearson y dibujo de las cards
├── README.md           → Este archivo
├── EXPLICACION.md      → Explicación detallada del código y de las fórmulas
└── assets/
    ├── styles.css      → Estilos
    └── variable.css    → Variables CSS (tipografías)
```

---

## Cómo usarlo

1. Clonar el repositorio:

    ```bash
    git clone https://github.com/Starscream84/Consulta-API-5.git
    ```

2. Abrir `index.html` en el navegador. También se puede usar la extensión **Live Server** de VS Code.

Hace falta conexión a internet para consultar la API y cargar Chart.js desde el CDN.

El detalle del código y de las fórmulas está en [EXPLICACION.md](EXPLICACION.md).

---

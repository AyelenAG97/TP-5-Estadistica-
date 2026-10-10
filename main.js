/*
 * TP5 - Estadística y Probabilidades - Relación entre variables
 * --------------------------------------------------------------
 * Este script:
 *   1. Consulta la API con fetch (GET) y obtiene 10 registros con
 *      presión, temperatura, humedad y velocidad del viento.
 *   2. Calcula el coeficiente de correlación de Pearson (r) para los
 *      6 pares posibles de variables.
 *   3. Dibuja un gráfico de barras divergente (de −1 a +1) con el r de
 *      los 6 pares, para compararlos de un vistazo.
 *   4. Crea un panel por par con el valor de r, un gráfico de dispersión
 *      (Chart.js) dividido en cuadrantes por los promedios x̄ e ȳ, la recta
 *      de regresión, el conteo de puntos por cuadrante y una descripción.
 *   5. Determina qué par tiene la mayor correlación (en valor absoluto)
 *      y lo muestra como conclusión.
 *   6. Llena una tabla con los datos crudos de la API.
 */

const API_URL = "https://apidemo.geoeducacion.com.ar/api/testing/pearson/1";

// Variables que devuelve la API, con su nombre para mostrar y su unidad
const VARIABLES = {
    presion: { nombre: "Presión", unidad: "hPa" },
    temperatura: { nombre: "Temperatura", unidad: "°C" },
    humedad: { nombre: "Humedad", unidad: "%" },
    viento: { nombre: "Velocidad del viento", unidad: "km/h" },
};

// Los 6 pares que pide la consigna, en el mismo orden
const PARES = [
    ["presion", "temperatura"],
    ["presion", "humedad"],
    ["presion", "viento"],
    ["temperatura", "humedad"],
    ["temperatura", "viento"],
    ["humedad", "viento"],
];

/*
 * Interpretación física de cada par, según el signo de r.
 * Se usa en la descripción de cada panel y en la conclusión.
 */
const INTERPRETACIONES = {
    "presion-temperatura": {
        positiva: "los días con mayor presión atmosférica tienden a ser más cálidos, algo típico de situaciones de alta presión con cielo despejado y más radiación solar.",
        negativa: "cuando sube la presión la temperatura tiende a bajar, como ocurre con el ingreso de masas de aire frío y denso.",
    },
    "presion-humedad": {
        positiva: "a mayor presión, mayor humedad relativa.",
        negativa: "a mayor presión, menor humedad: las altas presiones suelen traer aire más seco y estable, mientras que las bajas presiones se asocian a aire húmedo y nubosidad.",
    },
    "presion-viento": {
        positiva: "a mayor presión, más viento.",
        negativa: "a mayor presión, menos viento: los sistemas de alta presión suelen ser estables y calmos, mientras que las bajas presiones (frentes, ciclones) generan más viento.",
    },
    "temperatura-humedad": {
        positiva: "a mayor temperatura, mayor humedad relativa.",
        negativa: "a mayor temperatura, menor humedad relativa: el aire caliente puede contener más vapor de agua, por lo que con la misma cantidad de vapor el porcentaje de humedad baja.",
    },
    "temperatura-viento": {
        positiva: "los días más cálidos tienden a ser más ventosos.",
        negativa: "los días más cálidos tienden a tener menos viento: las jornadas calmas y estables (alta presión) se calientan más, mientras que el viento mezcla el aire y suele acompañar el ingreso de frentes fríos.",
    },
    "humedad-viento": {
        positiva: "a mayor humedad, más viento, lo que puede asociarse a frentes o sistemas de baja presión que traen aire húmedo y ráfagas.",
        negativa: "a mayor humedad, menos viento: el aire quieto favorece la acumulación de humedad (por ejemplo, nieblas en días calmos).",
    },
};

/*
 * Colores del gráfico. Son los mismos que define variable.css:
 * verde azulado = cuadrantes I y III (aporte positivo a r),
 * ciruela = cuadrantes II y IV (aporte negativo a r).
 */
const COLORES = {
    tinta: "#1f2a44",
    tintaSuave: "#52607a",
    grilla: "#dbe3ea",
    positivo: "#1f7a8c",
    positivoFondo: "rgba(31, 122, 140, 0.10)",
    negativo: "#9c3d6b",
    negativoFondo: "rgba(156, 61, 107, 0.10)",
};

// Tipografía y color por defecto de todos los gráficos
Chart.defaults.font.family = '"Instrument Sans", sans-serif';
Chart.defaults.color = COLORES.tintaSuave;

// Si el usuario pidió reducir el movimiento, los gráficos aparecen sin animación
const sinAnimacion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Guarda las instancias de los gráficos para destruirlas al recargar
let graficos = [];

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

document.getElementById("btnCargar").addEventListener("click", cargarDatos);
document.addEventListener("DOMContentLoaded", cargarDatos);

// ---------------------------------------------------------------------------
// Consumo de la API
// ---------------------------------------------------------------------------

/**
 * Pide los datos a la API y dispara los cálculos y el dibujo.
 * Mientras espera la respuesta se desactiva el botón, así un doble clic
 * no lanza dos pedidos a la vez (cada uno dibujaría sus propios paneles
 * y quedarían duplicados).
 */
async function cargarDatos() {
    const boton = document.getElementById("btnCargar");
    if (boton.disabled) return; // ya hay un pedido en curso

    boton.disabled = true;
    limpiarPantalla();
    agregarAlerta("info", "Consultando la API...");

    try {
        const res = await fetch(API_URL, { cache: "no-store" });

        // res.ok es false si la API responde con un error HTTP (404, 500, etc.)
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        if (!json.success || !json.data || json.data.length === 0 || !json.data[0].valores) {
            mostrarError("La API no devolvió datos válidos.");
            return;
        }

        // La API devuelve un array "data" con un solo objeto que contiene "valores"
        const valores = json.data[0].valores;

        // Se calcula r para cada par y se guarda junto con los datos del par
        const resultados = PARES.map(([varX, varY]) => {
            const x = valores.map((v) => v[varX]);
            const y = valores.map((v) => v[varY]);
            return { varX, varY, x, y, r: pearson(x, y) };
        });

        document.getElementById("alertas").innerHTML = "";
        dibujarEspectro(resultados);
        mostrarConclusion(resultados);
        resultados.forEach(crearCard);
        llenarTabla(valores);
    } catch (error) {
        console.error(error);
        mostrarError("Error al consultar la API. Revisá la conexión e intentá de nuevo.");
    } finally {
        // Se vuelve a habilitar el botón haya salido bien o mal
        boton.disabled = false;
    }
}

// ---------------------------------------------------------------------------
// Cálculos estadísticos
// ---------------------------------------------------------------------------

/** Promedio (media aritmética) de un array de números. */
function media(datos) {
    return datos.reduce((suma, v) => suma + v, 0) / datos.length;
}

/**
 * Coeficiente de correlación de Pearson:
 *
 *              Σ (xi - x̄)(yi - ȳ)
 *   r = ---------------------------------
 *        √( Σ (xi - x̄)² · Σ (yi - ȳ)² )
 *
 * El numerador es la covarianza (sin dividir por n) y el denominador el
 * producto de las desviaciones (sin dividir por n), por eso las n se cancelan.
 * El resultado siempre está entre -1 y 1.
 */
function pearson(x, y) {
    const mx = media(x);
    const my = media(y);

    let sumaXY = 0; // Σ (xi - x̄)(yi - ȳ)
    let sumaX2 = 0; // Σ (xi - x̄)²
    let sumaY2 = 0; // Σ (yi - ȳ)²

    for (let i = 0; i < x.length; i++) {
        const dx = x[i] - mx;
        const dy = y[i] - my;
        sumaXY += dx * dy;
        sumaX2 += dx * dx;
        sumaY2 += dy * dy;
    }

    // Si una variable no varía (todos sus valores son iguales) el denominador
    // es 0 y r no está definido. Se devuelve 0: no hay relación lineal medible.
    const denominador = Math.sqrt(sumaX2 * sumaY2);
    if (denominador === 0) return 0;

    return sumaXY / denominador;
}

/**
 * Recta de regresión por mínimos cuadrados: y = a + b·x
 *   b = Σ (xi - x̄)(yi - ȳ) / Σ (xi - x̄)²
 *   a = ȳ - b·x̄
 * Se dibuja en el gráfico para ver la tendencia que mide r.
 */
function regresion(x, y) {
    const mx = media(x);
    const my = media(y);
    let num = 0;
    let den = 0;
    for (let i = 0; i < x.length; i++) {
        num += (x[i] - mx) * (y[i] - my);
        den += (x[i] - mx) ** 2;
    }
    const b = num / den;
    const a = my - b * mx;
    return { a, b };
}

/**
 * Cuadrantes: las rectas x = x̄ e y = ȳ dividen el gráfico en cuatro.
 *
 *          II  |  I          I:   x > x̄  e  y > ȳ   → (xi − x̄)(yi − ȳ) > 0
 *        ------+------       II:  x < x̄  e  y > ȳ   → producto < 0
 *          III |  IV         III: x < x̄  e  y < ȳ   → producto > 0
 *                            IV:  x > x̄  e  y < ȳ   → producto < 0
 *
 * El numerador de Pearson es la suma de esos productos. Por eso, si la
 * mayoría de los puntos (y los más alejados) caen en I y III, r es positivo;
 * si caen en II y IV, r es negativo; y si se reparten parejo, r queda cerca de 0.
 *
 * Devuelve el promedio de cada variable, el cuadrante de cada punto, cuántos
 * puntos hay en cada cuadrante y cuánto suman los productos positivos y negativos.
 */
function cuadrantes(x, y) {
    const mx = media(x);
    const my = media(y);
    const conteo = { I: 0, II: 0, III: 0, IV: 0 };
    let sumaPositiva = 0; // Σ de productos > 0 (cuadrantes I y III)
    let sumaNegativa = 0; // Σ de |productos| < 0 (cuadrantes II y IV)

    const porPunto = x.map((xi, i) => {
        const dx = xi - mx;
        const dy = y[i] - my;
        const producto = dx * dy;

        if (producto > 0) sumaPositiva += producto;
        else sumaNegativa += -producto;

        // Un punto justo sobre un promedio (dx o dy = 0) aporta 0 y no se cuenta
        let cuadrante = null;
        if (dx > 0 && dy > 0) cuadrante = "I";
        else if (dx < 0 && dy > 0) cuadrante = "II";
        else if (dx < 0 && dy < 0) cuadrante = "III";
        else if (dx > 0 && dy < 0) cuadrante = "IV";

        if (cuadrante) conteo[cuadrante]++;
        return cuadrante;
    });

    return { mx, my, porPunto, conteo, sumaPositiva, sumaNegativa };
}

/**
 * Clasifica la fuerza de la correlación según el valor absoluto de r.
 * Devuelve el texto de la fuerza (y una clase con el mismo criterio).
 */
function clasificar(r) {
    const abs = Math.abs(r);
    if (abs >= 0.9) return { fuerza: "muy fuerte", clase: "fuerte" };
    if (abs >= 0.7) return { fuerza: "fuerte", clase: "fuerte" };
    if (abs >= 0.4) return { fuerza: "moderada", clase: "moderada" };
    if (abs >= 0.2) return { fuerza: "débil", clase: "debil" };
    return { fuerza: "muy débil o nula", clase: "debil" };
}

/** Arma la descripción que va debajo de cada gráfico. */
function describir(varX, varY, r) {
    const { fuerza } = clasificar(r);
    const nombreX = VARIABLES[varX].nombre;
    const nombreY = VARIABLES[varY].nombre;
    const signo = r >= 0 ? "positiva" : "negativa";

    if (Math.abs(r) < 0.2) {
        return `r = ${formatoR(r)}: no hay una relación lineal significativa entre ${nombreX.toLowerCase()} y ${nombreY.toLowerCase()}. Los puntos aparecen dispersos sin una tendencia clara.`;
    }

    const interpretacion = INTERPRETACIONES[`${varX}-${varY}`][signo];
    const direccion = r >= 0 ? "ambas variables tienden a aumentar juntas" : `cuando ${nombreX.toLowerCase()} aumenta, ${nombreY.toLowerCase()} tiende a disminuir`;

    let texto = `Correlación ${signo} ${fuerza} (r = ${formatoR(r)}): ${direccion}. En estos datos, ${interpretacion}`;

    if (Math.abs(r) < 0.7) {
        texto += " Sin embargo, la relación no es lo suficientemente fuerte como para predecir una variable a partir de la otra.";
    }
    return texto;
}


/** Id del panel de un par, para poder enlazarlo desde el gráfico de barras. */
function idPanel(varX, varY) {
    return `par-${varX}-${varY}`;
}

/** "positiva" o "negativa": se usa como clase CSS para elegir el color. */
function signo(r) {
    return r >= 0 ? "positiva" : "negativa";
}

// ---------------------------------------------------------------------------
// Plugin de Chart.js: división en cuadrantes
// ---------------------------------------------------------------------------

/*
 * Chart.js permite agregar "plugins" que dibujan sobre el canvas en distintos
 * momentos. Este dibuja, ANTES que los puntos (beforeDatasetsDraw):
 *   1. el fondo de cada cuadrante (I y III verde azulado, II y IV ciruela);
 *   2. las líneas punteadas de x̄ e ȳ que forman la división;
 *   3. el número romano de cada cuadrante en su esquina.
 * Los promedios le llegan por options.plugins.cuadrantes = { mediaX, mediaY }.
 */
const pluginCuadrantes = {
    id: "cuadrantes",
    beforeDatasetsDraw(chart, args, opciones) {
        const { ctx, chartArea, scales } = chart;
        const { left, right, top, bottom } = chartArea;

        // Posición en píxeles de los promedios dentro del canvas
        const px = scales.x.getPixelForValue(opciones.mediaX);
        const py = scales.y.getPixelForValue(opciones.mediaY);

        ctx.save();

        // 1. Fondos. En el canvas la Y crece hacia abajo: "top" es el borde superior.
        ctx.fillStyle = COLORES.positivoFondo;
        ctx.fillRect(px, top, right - px, py - top); // I   (arriba a la derecha)
        ctx.fillRect(left, py, px - left, bottom - py); // III (abajo a la izquierda)
        ctx.fillStyle = COLORES.negativoFondo;
        ctx.fillRect(left, top, px - left, py - top); // II  (arriba a la izquierda)
        ctx.fillRect(px, py, right - px, bottom - py); // IV  (abajo a la derecha)

        // 2. Líneas de los promedios
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = 1.25;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(px, top);
        ctx.lineTo(px, bottom);
        ctx.moveTo(left, py);
        ctx.lineTo(right, py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Nombre de cada línea, en el borde del gráfico
        ctx.font = '600 11px "Instrument Sans", sans-serif';
        ctx.fillStyle = COLORES.tinta;
        ctx.textBaseline = "bottom";
        promedioConBarra(ctx, "x", px + 5, bottom - 4, "left");
        promedioConBarra(ctx, "y", right - 5, py - 3, "right");

        // 3. Número de cada cuadrante en su esquina exterior
        ctx.font = '700 15px "Bricolage Grotesque", sans-serif';
        const margen = 8;
        const etiqueta = (texto, color, x, y, alineacion, base) => {
            ctx.fillStyle = color;
            ctx.textAlign = alineacion;
            ctx.textBaseline = base;
            ctx.fillText(texto, x, y);
        };
        etiqueta("I", COLORES.positivo, right - margen, top + margen, "right", "top");
        etiqueta("II", COLORES.negativo, left + margen, top + margen, "left", "top");
        etiqueta("III", COLORES.positivo, left + margen, bottom - margen, "left", "bottom");
        etiqueta("IV", COLORES.negativo, right - margen, bottom - margen, "right", "bottom");

        ctx.restore();
    },
};

/**
 * Escribe "x̄" o "ȳ" en el canvas: la letra y una rayita encima.
 * Se dibuja a mano porque muchas fuentes no traen el carácter combinado.
 */
function promedioConBarra(ctx, letra, x, y, alineacion) {
    ctx.textAlign = alineacion;
    ctx.fillText(letra, x, y);
    const ancho = ctx.measureText(letra).width;
    const inicio = alineacion === "right" ? x - ancho : x;
    ctx.fillRect(inicio, y - 11, ancho, 1.25);
}

// ---------------------------------------------------------------------------
// Salida en pantalla (DOM)
// ---------------------------------------------------------------------------

/**
 * Gráfico de barras divergente con el r de los 6 pares.
 * Cada fila tiene una pista que va de −1 (izquierda) a +1 (derecha) con el 0
 * en el centro. La barra arranca en el 0 y llega hasta r:
 *   - posición del 0 en la pista: 50 %
 *   - largo de la barra: |r| · 50 %
 *   - si r > 0 la barra empieza en 50 %; si r < 0 empieza en 50 % − largo.
 * Las filas se ordenan de mayor a menor r y cada una enlaza a su panel.
 */
function dibujarEspectro(resultados) {
    const lista = document.getElementById("espectro");
    lista.innerHTML = "";

    [...resultados]
        .sort((p, q) => q.r - p.r)
        .forEach(({ varX, varY, r }) => {
            const largo = Math.abs(r) * 50;
            const inicio = r >= 0 ? 50 : 50 - largo;
            const nombre = `${VARIABLES[varX].nombre} y ${VARIABLES[varY].nombre}`;

            const li = document.createElement("li");
            li.innerHTML = `
                <a href="#${idPanel(varX, varY)}" aria-label="${nombre}: r = ${formatoR(r)}">
                    <span class="espectro-nombre">${nombre}</span>
                    <span class="espectro-pista">
                        <span class="espectro-barra ${signo(r)}" style="left: ${inicio}%; width: ${largo}%"></span>
                    </span>
                    <span class="espectro-valor ${signo(r)}">${formatoR(r)}</span>
                </a>
            `;
            lista.appendChild(li);
        });
}

/** r con signo explícito y coma decimal: +0,7043 / −0,7368 */
function formatoR(r) {
    const texto = Math.abs(r).toFixed(4).replace(".", ",");
    return (r >= 0 ? "+" : "−") + texto;
}

/**
 * Crea el panel de un par: gráfico a la izquierda y, a la derecha, el valor
 * de r, el conteo de puntos por cuadrante, el aporte de cada grupo de
 * cuadrantes al numerador de Pearson y la descripción.
 */
function crearCard(resultado) {
    const { varX, varY, x, y, r } = resultado;
    const { fuerza } = clasificar(r);
    const infoX = VARIABLES[varX];
    const infoY = VARIABLES[varY];
    const cuad = cuadrantes(x, y);

    // Porcentaje del "tira y afloje" entre productos positivos y negativos
    const total = cuad.sumaPositiva + cuad.sumaNegativa;
    const pctPos = total === 0 ? 50 : (cuad.sumaPositiva / total) * 100;
    const pctNeg = 100 - pctPos;

    const panel = document.createElement("article");
    panel.className = "panel";
    panel.id = idPanel(varX, varY);
    panel.innerHTML = `
        <div class="chart-container">
            <canvas role="img" aria-label="Dispersión de ${infoX.nombre} y ${infoY.nombre} dividida en cuadrantes"></canvas>
        </div>
        <div class="panel-lectura">
            <h3>${infoX.nombre} y ${infoY.nombre}</h3>
            <div class="panel-r">
                <span class="r ${signo(r)}">r = ${formatoR(r)}</span>
                <span class="fuerza">${r >= 0 ? "Positiva" : "Negativa"} ${fuerza}</span>
            </div>
            <div class="conteo" aria-label="Puntos por cuadrante">
                <div class="neg"><strong>${cuad.conteo.II}</strong>en II</div>
                <div class="pos"><strong>${cuad.conteo.I}</strong>en I</div>
                <div class="pos"><strong>${cuad.conteo.III}</strong>en III</div>
                <div class="neg"><strong>${cuad.conteo.IV}</strong>en IV</div>
            </div>
            <div>
                <p class="aporte-titulo">Peso de cada lado en Σ (x<sub>i</sub> − <span class="media">x</span>)(y<sub>i</sub> − <span class="media">y</span>)</p>
                <div class="aporte-barra" aria-hidden="true">
                    <span class="pos" style="width: ${pctPos}%"></span>
                    <span class="neg" style="width: ${pctNeg}%"></span>
                </div>
                <div class="aporte-leyenda">
                    <span class="pos">I y III: ${pctPos.toFixed(0)} %</span>
                    <span class="neg">II y IV: ${pctNeg.toFixed(0)} %</span>
                </div>
            </div>
            <p class="descripcion">${describir(varX, varY, r)}</p>
        </div>
    `;
    document.getElementById("cards").appendChild(panel);

    dibujarDispersion(panel.querySelector("canvas"), x, y, infoX, infoY, cuad);
}

/** Dibuja el gráfico de dispersión con cuadrantes y recta de regresión. */
function dibujarDispersion(canvas, x, y, infoX, infoY, cuad) {
    const puntos = x.map((xi, i) => ({ x: xi, y: y[i] }));

    // Cada punto toma el color de su cuadrante
    const coloresPuntos = cuad.porPunto.map((c) => {
        if (c === "I" || c === "III") return COLORES.positivo;
        if (c === "II" || c === "IV") return COLORES.negativo;
        return COLORES.tinta; // justo sobre un promedio
    });

    // La recta se dibuja con dos puntos: en el mínimo y en el máximo de X
    const { a, b } = regresion(x, y);
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const recta = [
        { x: xMin, y: a + b * xMin },
        { x: xMax, y: a + b * xMax },
    ];

    const grafico = new Chart(canvas, {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "Mediciones",
                    data: puntos,
                    backgroundColor: coloresPuntos,
                    borderColor: "#f7fafc",
                    borderWidth: 1.5,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                },
                {
                    label: "Recta de regresión",
                    data: recta,
                    type: "line",
                    borderColor: COLORES.tinta,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                },
            ],
        },
        plugins: [pluginCuadrantes],
        options: {
            maintainAspectRatio: false,
            animation: sinAnimacion ? false : { duration: 500 },
            plugins: {
                cuadrantes: { mediaX: cuad.mx, mediaY: cuad.my },
                // Sin leyenda: los colores se explican en "Cómo leer los cuadrantes"
                legend: { display: false },
                tooltip: {
                    backgroundColor: COLORES.tinta,
                    filter: (item) => item.datasetIndex === 0, // tooltip solo en los puntos
                    callbacks: {
                        title: (items) => `Medición ${items[0].dataIndex + 1} · cuadrante ${cuad.porPunto[items[0].dataIndex] ?? "—"}`,
                        label: (ctx) => [
                            `${infoX.nombre}: ${ctx.parsed.x.toFixed(2)} ${infoX.unidad}`,
                            `${infoY.nombre}: ${ctx.parsed.y.toFixed(2)} ${infoY.unidad}`,
                        ],
                    },
                },
            },
            scales: {
                x: {
                    title: { display: true, text: `${infoX.nombre} (${infoX.unidad})`, color: COLORES.tinta },
                    grid: { color: COLORES.grilla },
                    border: { display: false },
                    grace: "5%",
                },
                y: {
                    title: { display: true, text: `${infoY.nombre} (${infoY.unidad})`, color: COLORES.tinta },
                    grid: { color: COLORES.grilla },
                    border: { display: false },
                    grace: "8%",
                },
            },
        },
    });

    graficos.push(grafico);
}

/** Muestra qué par tiene la mayor correlación (en valor absoluto) y qué implica. */
function mostrarConclusion(resultados) {
    // Se ordena por |r| de mayor a menor: el primero es el de mayor correlación
    const ordenados = [...resultados].sort((p, q) => Math.abs(q.r) - Math.abs(p.r));
    const mayor = ordenados[0];
    const { fuerza } = clasificar(mayor.r);
    const nombreX = VARIABLES[mayor.varX].nombre;
    const nombreY = VARIABLES[mayor.varY].nombre;

    const cont = document.getElementById("conclusion");
    cont.innerHTML = `
        <h2>La relación más fuerte: ${nombreX} y ${nombreY}</h2>
        <p>
            Es una correlación ${signo(mayor.r)} ${fuerza} (r = ${formatoR(mayor.r)}).
            Esto implica que ${INTERPRETACIONES[`${mayor.varX}-${mayor.varY}`][signo(mayor.r)]}
        </p>
        <p>
            La muestra es chica (${mayor.x.length} mediciones) y correlación no implica causalidad:
            ambas variables pueden depender de un tercer factor, como el sistema de presión dominante.
        </p>
    `;
    cont.hidden = false;
}

/** Llena la tabla con los datos crudos de la API. */
function llenarTabla(valores) {
    const tbody = document.querySelector("#tablaDatos tbody");
    tbody.innerHTML = "";

    valores.forEach((v, i) => {
        const tr = document.createElement("tr");
        [i + 1, v.presion.toFixed(2), v.temperatura.toFixed(2), v.humedad.toFixed(2), v.viento.toFixed(2)].forEach((contenido) => {
            const td = document.createElement("td");
            td.textContent = contenido;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

/** Borra paneles, gráficos, barras, conclusión y tabla antes de una nueva carga. */
function limpiarPantalla() {
    graficos.forEach((g) => g.destroy());
    graficos = [];
    document.getElementById("cards").innerHTML = "";
    document.getElementById("espectro").innerHTML = "";
    document.getElementById("alertas").innerHTML = "";
    document.querySelector("#tablaDatos tbody").innerHTML = "";
    document.getElementById("conclusion").hidden = true;
}

/** Muestra un mensaje de error. */
function mostrarError(texto) {
    document.getElementById("alertas").innerHTML = "";
    agregarAlerta("error", texto);
}

/** Crea un div de alerta con la clase CSS correspondiente al tipo. */
function agregarAlerta(tipo, texto) {
    const div = document.createElement("div");
    div.className = `alerta alerta-${tipo}`;
    div.textContent = texto;
    document.getElementById("alertas").appendChild(div);
}

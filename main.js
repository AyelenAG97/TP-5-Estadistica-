/*
 * TP5 - Estadística y Probabilidades - Relación entre variables
 * --------------------------------------------------------------
 * Este script:
 *   1. Consulta la API con fetch (GET) y obtiene 10 registros con
 *      presión, temperatura, humedad y velocidad del viento.
 *   2. Calcula el coeficiente de correlación de Pearson (r) para los
 *      6 pares posibles de variables.
 *   3. Crea una card por par con el valor de r, un gráfico de dispersión
 *      (Chart.js) con su recta de regresión y una descripción del resultado.
 *   4. Determina qué par tiene la mayor correlación (en valor absoluto)
 *      y lo muestra como conclusión.
 *   5. Llena una tabla con los datos crudos de la API.
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
 * Se usa en la descripción de cada card y en la conclusión.
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
 * no lanza dos pedidos a la vez (cada uno dibujaría sus propias cards
 * y quedarían duplicadas).
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
        resultados.forEach(crearCard);
        mostrarConclusion(resultados);
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
 * Clasifica la fuerza de la correlación según el valor absoluto de r.
 * Devuelve el texto y la clase CSS para el color de la card.
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
        return `r = ${r.toFixed(4)}: no hay una relación lineal significativa entre ${nombreX.toLowerCase()} y ${nombreY.toLowerCase()}. Los puntos aparecen dispersos sin una tendencia clara.`;
    }

    const interpretacion = INTERPRETACIONES[`${varX}-${varY}`][signo];
    const direccion = r >= 0 ? "ambas variables tienden a aumentar juntas" : `cuando ${nombreX.toLowerCase()} aumenta, ${nombreY.toLowerCase()} tiende a disminuir`;

    let texto = `Correlación ${signo} ${fuerza} (r = ${r.toFixed(4)}): ${direccion}. En estos datos, ${interpretacion}`;

    if (Math.abs(r) < 0.7) {
        texto += " Sin embargo, la relación no es lo suficientemente fuerte como para predecir una variable a partir de la otra.";
    }
    return texto;
}

// ---------------------------------------------------------------------------
// Salida en pantalla (DOM)
// ---------------------------------------------------------------------------

/** Crea la card de un par: título, valor de r, gráfico y descripción. */
function crearCard(resultado) {
    const { varX, varY, x, y, r } = resultado;
    const { fuerza, clase } = clasificar(r);
    const infoX = VARIABLES[varX];
    const infoY = VARIABLES[varY];

    const card = document.createElement("article");
    card.className = `card card-${clase}`;
    card.innerHTML = `
        <h2>${infoX.nombre} y ${infoY.nombre}</h2>
        <div class="valor-r">
            <span class="r">r = ${r.toFixed(4)}</span>
            <span class="badge badge-${clase}">${r >= 0 ? "Positiva" : "Negativa"} ${fuerza}</span>
        </div>
        <div class="chart-container"><canvas></canvas></div>
        <p class="descripcion">${describir(varX, varY, r)}</p>
    `;
    document.getElementById("cards").appendChild(card);

    dibujarDispersion(card.querySelector("canvas"), x, y, infoX, infoY, clase);
}

/** Dibuja el gráfico de dispersión con la recta de regresión. */
function dibujarDispersion(canvas, x, y, infoX, infoY, clase) {
    const puntos = x.map((xi, i) => ({ x: xi, y: y[i] }));

    // La recta se dibuja con dos puntos: en el mínimo y en el máximo de X
    const { a, b } = regresion(x, y);
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const recta = [
        { x: xMin, y: a + b * xMin },
        { x: xMax, y: a + b * xMax },
    ];

    const colorRecta = { fuerte: "#e15759", moderada: "#f28e2b", debil: "#9c9c9c" }[clase];

    const grafico = new Chart(canvas, {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "Mediciones",
                    data: puntos,
                    backgroundColor: "#4e79a7",
                    pointRadius: 5,
                    pointHoverRadius: 7,
                },
                {
                    label: "Recta de regresión",
                    data: recta,
                    type: "line",
                    borderColor: colorRecta,
                    borderDash: [6, 4],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { boxWidth: 14, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${infoX.nombre}: ${ctx.parsed.x.toFixed(2)} ${infoX.unidad} | ${infoY.nombre}: ${ctx.parsed.y.toFixed(2)} ${infoY.unidad}`,
                    },
                },
            },
            scales: {
                x: { title: { display: true, text: `${infoX.nombre} (${infoX.unidad})` } },
                y: { title: { display: true, text: `${infoY.nombre} (${infoY.unidad})` } },
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
    const signo = mayor.r >= 0 ? "positiva" : "negativa";
    const nombreX = VARIABLES[mayor.varX].nombre;
    const nombreY = VARIABLES[mayor.varY].nombre;

    const ranking = ordenados.map((p) => `<li>${VARIABLES[p.varX].nombre} y ${VARIABLES[p.varY].nombre}: <strong>${p.r.toFixed(4)}</strong></li>`).join("");

    const cont = document.getElementById("conclusion");
    cont.innerHTML = `
        <h2>Conclusión</h2>
        <p>
            El par con mayor correlación es <strong>${nombreX} y ${nombreY}</strong>,
            con una correlación ${signo} ${fuerza} (r = ${mayor.r.toFixed(4)}).
            Esto implica que ${INTERPRETACIONES[`${mayor.varX}-${mayor.varY}`][signo]}
        </p>
        <p>
            Hay que tener en cuenta que la muestra es chica (${mayor.x.length} mediciones) y que
            correlación no implica causalidad: ambas variables pueden estar influidas por un
            tercer factor, como el tipo de sistema de presión dominante.
        </p>
        <h3>Ranking por fuerza de la correlación (|r|)</h3>
        <ol>${ranking}</ol>
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

/** Borra cards, gráficos, conclusión y tabla antes de una nueva carga. */
function limpiarPantalla() {
    graficos.forEach((g) => g.destroy());
    graficos = [];
    document.getElementById("cards").innerHTML = "";
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

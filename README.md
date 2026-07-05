# Clínica Quillay — Landing institucional (demo)

Landing de una sola página para un hospital/clínica chilena. **HTML + CSS + JS
vanilla, sin frameworks ni librerías.** El widget de reserva funciona como demo
(valida datos pero **no** los envía: está listo para conectar a un backend
PHP/MySQL).

> **Marca ficticia y 100% editable.** "Clínica Quillay" y todos los textos,
> colores y datos son de ejemplo.

## Estructura de archivos

```
Hospital/
├── index.html              ← Estructura / contenido (todas las secciones)
├── assets/
│   ├── css/
│   │   └── styles.css      ← Sistema de diseño y todos los estilos
│   └── js/
│       ├── app.js          ← Menú, buscador, FAQ, tabs, animaciones
│       └── booking.js      ← Widget de reserva (4 pasos) + validación de RUT
├── server.js               ← Servidor estático SOLO para previsualizar (opcional)
└── README.md
```

## Cómo verlo

Abre `index.html` directamente en el navegador, **o** levanta un servidor local:

```bash
node server.js        # luego abre http://localhost:5500
# o, si tienes Python:  python -m http.server 5500
```

(`server.js` no es parte del sitio; solo sirve los archivos para desarrollo.)

## Secciones incluidas

Barra utilitaria (urgencia · call center · resultados · portal) · header sticky
con menú responsive y CTA "Reservar hora" · hero con **widget de reserva de 4
pasos** · accesos rápidos · especialidades con **buscador en vivo** · centros y
servicios · cuerpo médico · telemedicina · información al paciente (convenios
FONASA/Isapres/particular + formas de pago + **FAQ acordeón**) · noticias ·
banda CTA · footer con sedes.

## Diseño (editable)

- **Paleta** (6 colores): se define en `:root` dentro de `assets/css/styles.css`.
  Tema cálido tipo "cordillera + cuidado" (verde profundo, coral, ocre, crema).
  Cambia las variables `--pine`, `--coral`, `--ochre`, `--cream`, etc. y todo el
  sitio se re-marca.
- **Tipografías** (2): `Fraunces` (display) + `Inter` (body), vía Google Fonts.
  Es la **única dependencia externa**; si la quitas, caen a fuentes del sistema.
- **Elemento de firma**: la silueta de cordillera (divisor del hero) y el logo
  con hoja de quillay + línea de pulso.

## Accesibilidad

Skip link · foco visible (`:focus-visible`) · roles/aria en menú, stepper, tabs
y acordeón · `aria-live` en validaciones y buscador · soporte de
`prefers-reduced-motion`.

## Editar la marca

En `index.html` busca y reemplaza:

- Nombre y lema: bloques con la clase `.brand` (header y footer) y el `<title>`.
- Teléfonos: `tel:` de la barra utilitaria, banda CTA y footer.
- Sedes/direcciones: sección `#centros` y footer.

## Widget de reserva → conectar al backend

El flujo (RUT + previsión → centro → especialidad → profesional → confirmación)
valida en el cliente pero **no envía nada**. Los datos de centros,
especialidades, profesionales y horarios están como arrays editables al inicio
de `assets/js/booking.js`.

Para conectarlo a **PHP/MySQL**, busca en `assets/js/booking.js` el comentario:

```js
// ===> PUNTO DE CONEXIÓN AL BACKEND (PHP/MySQL)
```

Ahí tienes el objeto `payload` listo y un ejemplo de `fetch()` hacia
`/api/reservas.php`. La validación de RUT usa módulo 11 (`validarRut`).

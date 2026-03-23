# 📁 Carpeta de Imágenes — MeWe Academy

Coloca tus imágenes aquí. Cuando las tengas listas, actualiza el HTML.

---

## 🔹 Logo principal

**Archivo:** `mewe-logo.svg` (o `mewe-logo.png`)

**Cómo activarlo en landing.html / index.html:**

Busca esta parte en el HTML:
```html
<!-- LOGO: cuando tengas el archivo, cambia esto por... -->
<div class="logo-img-fallback">
  <span class="logo-mewe">MEWE</span>
  <span class="logo-sub">Academy</span>
</div>
```

**Cámbialo por:**
```html
<img src="img/mewe-logo.svg" class="logo-img" alt="MeWe Academy">
```

**Especificaciones recomendadas del logo:**
- Formato: SVG (ideal) o PNG con fondo transparente
- Versión: horizontal (logo + texto "MeWe Academy")
- Alto máximo: 40px en pantalla (puede ser más alto en el archivo)
- Color recomendado: blanco/crema (#F0EDE8) para que se vea bien sobre fondo oscuro
- También puedes tener una versión en dorado (#C9A96E) para elegancia

---

## 🔹 Otras imágenes opcionales (para agregar después)

| Archivo              | Uso                              | Tamaño sugerido  |
|---------------------|----------------------------------|-----------------|
| `dashboard.png`     | Captura real del app en el hero  | 1200 x 800 px   |
| `mobile-app.png`    | Pantalla del feed TikTok-style   | 390 x 844 px    |
| `certificate.png`   | Ejemplo de certificado           | 1200 x 800 px   |
| `favicon.ico`       | Ícono en la pestaña del browser  | 32 x 32 px      |

---

## 💡 Consejos

- Los archivos SVG son preferibles a PNG porque escalan sin perder calidad
- Para el logo, asegúrate de que se vea bien sobre fondo muy oscuro (#0B1426)
- Puedes generar el logo con Midjourney, DALL-E o contratar a un diseñador en Fiverr/99designs
- Mira los prompts en `PROMPTS-IA.md` para generar imágenes con IA



# Plan: Evitar reinicio de video en PiP + Descarga de diapositivas

## Problema 1: Video se reinicia al cambiar a PiP

**Causa**: El iframe se destruye y recrea al alternar entre modo normal y PiP porque se renderiza condicionalmente en ubicaciones diferentes del DOM (`{!pip && ...}` vs `{pip && ...}`). Cada vez que React desmonta y monta un iframe, el video vuelve a cargar desde cero.

**Solución**: Renderizar el iframe **una sola vez** y usar CSS para moverlo entre posiciones:
- Siempre renderizar el video dentro de un único contenedor
- Cuando `pip = false`: el contenedor ocupa su espacio normal en el layout (position relative, tamaño según layout)
- Cuando `pip = true`: el contenedor cambia a `position: fixed` en la esquina inferior derecha con tamaño pequeño
- El iframe nunca se desmonta, así que el video sigue reproduciéndose sin interrupciones

## Problema 2: Descargar diapositivas

Agregar un botón de descarga (icono `Download`) en la barra inferior de las diapositivas que:
- Descarga la imagen actual de la diapositiva usando un link `<a download>` con la URL de la imagen
- Solo se muestra si la diapositiva tiene `media_url`

---

## Archivo a modificar

`src/components/presentation/VideoSlidesView.tsx`

### Cambios específicos:

1. **Video único con CSS condicional**: Eliminar los 3 bloques condicionales de video (normal, slides-top, pip) y reemplazar con un solo `<div>` que cambie de clases CSS según `pip`:
   - `pip = false`: clases de posición según layout (igual que ahora)
   - `pip = true`: `fixed bottom-4 right-4 w-56 h-32 z-50 rounded-lg`

2. **Botón de descarga**: En la barra inferior de slides (línea ~239), agregar botón con icono `Download` que ejecute `window.open(currentSlide.media_url)` o cree un `<a>` temporal con `download` attribute.


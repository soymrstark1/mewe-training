

# Plan: Nuevo rol "Academia" — Entidad organizacional

## Concepto

Una **academia** es una entidad/organización con nombre, logo y un administrador. Puede tener múltiples maestros (y un maestro puede pertenecer a múltiples academias). La academia puede crear y editar contenido en el panel de cualquier maestro inscrito. Los alumnos se inscriben en la academia y ven automáticamente a todos sus maestros.

---

## 1. Base de datos (migraciones)

### Nuevo enum value
```sql
ALTER TYPE public.app_role ADD VALUE 'academy';
```

### Tabla `academies`
```sql
CREATE TABLE public.academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  admin_user_id uuid NOT NULL, -- usuario con rol 'academy'
  access_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;
```

### Tabla `academy_teachers` (relación many-to-many)
```sql
CREATE TABLE public.academy_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(academy_id, teacher_id)
);
ALTER TABLE public.academy_teachers ENABLE ROW LEVEL SECURITY;
```

### Tabla `academy_students` (inscripción de alumnos en la academia)
```sql
CREATE TABLE public.academy_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  student_auth_user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(academy_id, student_auth_user_id)
);
ALTER TABLE public.academy_students ENABLE ROW LEVEL SECURITY;
```

### Función helper + RLS policies
- `is_academy_admin(_user_id uuid, _academy_id uuid)` — security definer
- Políticas para que el admin de la academia pueda CRUD en sus tablas
- Políticas para que los alumnos de la academia puedan ver maestros y clases
- El admin de academia también necesita poder leer/escribir `teacher_classes`, `teacher_slides`, `slide_actions` de los maestros inscritos en su academia — esto se logra con políticas RLS adicionales en esas tablas existentes

---

## 2. Lógica de acceso del admin de academia a contenido de maestros

Agregar políticas RLS en las tablas existentes para que el usuario con rol `academy` pueda operar sobre los maestros de su academia:

- **`teacher_classes`**: SELECT/INSERT/UPDATE/DELETE si el `teacher_id` está en `academy_teachers` donde `academy_id` pertenece al usuario
- **`teacher_slides`**: Igual, vía `teacher_id`
- **`slide_actions`**: Vía join a `teacher_slides` → `academy_teachers`
- **`student_progress`**: SELECT para ver progreso consolidado

Se creará una función `is_academy_manager(_user_id uuid, _teacher_id uuid)` que verifica si el usuario administra una academia que contiene a ese maestro.

---

## 3. Nuevas páginas y componentes

### Página `/academy` — Panel de la Academia
- Header con logo/nombre de la academia
- Pestañas:
  - **Maestros**: Lista de maestros inscritos, agregar/quitar maestros, ver cada maestro
  - **Clases**: Al seleccionar un maestro, muestra `ClassManager` con su teacherId (reutiliza el componente existente)
  - **Alumnos**: Lista consolidada de alumnos inscritos en la academia
  - **Rendimiento**: Vista consolidada de progreso de alumnos por maestro (métricas de performance)
  - **Ajustes**: Nombre, logo, código de acceso de la academia

### Componente `AcademyTeacherSelector`
- Lista de maestros de la academia
- Al seleccionar uno, carga su `ClassManager` / `StudentProgressView` / etc.

### Ruta en `App.tsx`
```tsx
<Route path="/academy" element={<AcademyPanel />} />
```

---

## 4. Dashboard del alumno — Botón "Academia"

Cuando un alumno está inscrito en una o más academias:
- Mostrar un botón/card por academia en el dashboard
- Al presionarlo, despliega la lista de maestros de esa academia con sus fotos y nombres
- Al seleccionar un maestro, muestra sus clases (igual que ahora con maestros individuales)

La inscripción se hace con un código de acceso de la academia (similar al código de maestro actual).

---

## 5. Flujo de inscripción de alumnos

En el Login (modo `access-code`) o en el Dashboard:
- Si el código corresponde a una academia → inscribir en `academy_students` + inscribir automáticamente en `teacher_students` de todos los maestros activos de esa academia
- Si el código corresponde a un maestro → funciona como ahora

---

## 6. Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| Migración SQL | Crear tablas, enum, funciones, RLS |
| `src/pages/AcademyPanel.tsx` | **Nuevo** — panel de gestión de academia |
| `src/pages/Dashboard.tsx` | Agregar sección de academias para alumnos |
| `src/pages/Login.tsx` | Soportar código de acceso de academia |
| `src/App.tsx` | Agregar ruta `/academy` |
| `src/hooks/useAdminCheck.ts` | Agregar detección de rol `academy` |

---

## 7. Orden de implementación

1. Migración: tablas + enum + funciones + RLS
2. AcademyPanel con pestañas (reutilizando ClassManager, StudentProgressView)
3. Dashboard: sección de academias para alumnos
4. Login: soporte de código de academia
5. Rutas y navegación


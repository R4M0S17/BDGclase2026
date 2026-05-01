# C4 Model — Nivel Contenedores — Mini Jira v0.1

```mermaid
C4Container
    title Container Diagram — Mini Jira v0.1

    Person(member, "Member", "Miembro del equipo: crea, edita y comenta tickets propios")
    Person(admin, "Admin", "Gestiona usuarios, archiva cualquier ticket, accede a métricas")

    System_Boundary(minijira, "Mini Jira") {
        Container(spa, "Single-Page Application", "React 18 · Zustand · shadcn/ui", "Tablero Kanban, gestión de tickets, dashboard de métricas y exportación CSV")
        Container(api, "API Server", "Node.js 20 · Express 5 · Prisma", "Lógica de negocio, permisos por rol, Optimistic Locking (campo version), streaming CSV fila a fila")
        ContainerDb(postgres, "Base de Datos Principal", "PostgreSQL 16", "Tickets, usuarios, roles, comentarios, asignados, etiquetas, métricas históricas")
        ContainerDb(redis, "Caché / Sesiones", "Redis", "Rate limiting de emails, lista negra de JWT para logout")
    }

    System_Ext(oauth, "OAuth Provider", "Google Workspace u otro proveedor corporativo. Autentica identidades del equipo.")
    System_Ext(resend, "Resend", "Servicio de email transaccional. Notificaciones de asignación, comentarios y menciones @handle.")

    Rel(member, spa, "Usa", "HTTPS")
    Rel(admin, spa, "Usa", "HTTPS")

    Rel(spa, oauth, "Redirige para login · recibe code", "OAuth 2.0 / HTTPS")
    Rel(spa, api, "Consume recursos REST", "HTTPS · JSON · JWT Bearer")

    Rel(api, oauth, "Verifica identity token", "HTTPS")
    Rel(api, postgres, "Lee y escribe", "Prisma ORM / TCP 5432")
    Rel(api, redis, "Rate limiting · blacklist JWT", "Redis Protocol / TCP 6379")
    Rel(api, resend, "Despacha emails tras verificar comentario activo", "HTTPS · API REST")
```

---

## Decisiones de diseño

| Elemento | Justificación |
|---|---|
| SPA separada del API | Permite cachear assets estáticos en CDN y escalar el API independientemente |
| API única (monolito modular) | Equipo de 10 personas, 3 semanas; microservicios sería over-engineering en v1 |
| Redis fuera del boundary de DB | Rol distinto: no persiste datos de negocio, solo estado de sesión y control de rate |
| `Rel(api → resend)` con descripción de lógica | El EC-1 del backlog exige que la API verifique si el comentario sigue activo *antes* de llamar a Resend |
| OAuth externo con doble flecha | La SPA maneja el redirect; el API valida el token — flujo Authorization Code estándar |

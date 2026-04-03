

## Dashboard do Participante/Representante

### O que muda

**1. Sidebar (`DashboardLayout.tsx`)** -- Atualizar os itens de navegação para participante/representante:
- Dashboard (`/participante`)
- Meu Grupo (`/participante/grupo`)
- Ideias (`/participante/ideias`)
- Semana Atual (`/participante/semana`)
- Materiais (`/participante/materiais`)

Substituir os ícones: adicionar `BookOpen` para Materiais e `Users` para Meu Grupo.

**2. Página principal (`ParticipanteDashboard.tsx`)** -- Reescrever com:

**3 cards no topo (grid 3 colunas):**
- **Semana Atual**: busca `weeks` onde `is_active = true`, exibe `title`. Fallback: "Nao iniciado"
- **Meu Grupo**: busca `groups` pelo `group_id` do perfil do usuario. Fallback: "Sem grupo"
- **Entregas Pendentes**: exibe "—" (valor fixo por ora)

**Secao "Tema da Semana":**
- Busca o campo `theme` da semana ativa
- Se nenhuma semana ativa: exibe "O desafio ainda nao comecou." com icone ilustrativo
- Se existe tema: exibe em um card glassmorphism

**Loading**: skeleton animado em todos os cards e na secao de tema.

### Detalhes tecnicos

- Queries ao Supabase com timeout de 8s (padrao do projeto)
- `profile.group_id` ja disponivel via `useAuth()` para buscar o grupo
- Usa `.maybeSingle()` para queries que podem retornar 0 linhas
- Icones: `Calendar`, `Users`, `FileText`, `BookOpen`, `Sparkles`
- Nenhuma nova tabela ou migracao necessaria


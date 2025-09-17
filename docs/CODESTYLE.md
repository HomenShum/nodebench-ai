# Code Style Guidelines

These guidelines help keep the codebase consistent and avoid common runtime issues.

## React Hooks Placement

- Always declare React hooks (e.g., `useState`, `useEffect`, `useQuery`, `useMutation`, `useAction`, custom hooks) at the top of the component body, before any callbacks that reference them.
- Do not place hook declarations inside conditions or loops.
- Example (good):

```tsx
function Sidebar() {
  // 1) Hooks first
  const user = useQuery(api.auth.loggedInUser);
  const createTask = useMutation(api.tasks.createTask);

  // 2) Then callbacks using those hooks
  const handleCreateTask = useCallback(async () => {
    if (!user) return;
    await createTask({ title: "New Task" });
  }, [user, createTask]);

  // 3) JSX last
  return <div />;
}
```

- Example (bad):

```tsx
function Sidebar() {
  const handleCreateTask = useCallback(async () => {
    // ❌ createTask is referenced before it's declared
    await createTask({ title: "New Task" });
  }, []);

  const createTask = useMutation(api.tasks.createTask);
  return <div />;
}
```

## Lint Rules

- Hooks correctness: `react-hooks/rules-of-hooks: error`
- Dependencies: `react-hooks/exhaustive-deps: warn`
- Prevent usage before declaration: `@typescript-eslint/no-use-before-define: error`

Run ESLint:

```bash
npm run lint:eslint
# or to auto-fix
npm run lint:eslint:fix
```

## General

- Prefer small, focused components and hooks.
- Keep imports sorted (IDE feature is fine).
- Avoid implicit `any`; prefer explicit types.
- Co-locate components and related hooks/styles where reasonable.

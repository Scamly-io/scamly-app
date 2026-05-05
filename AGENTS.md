## Learned User Preferences
- Prefer implementing UI copy/structure exactly as provided (titles, subtitles, bullets, CTA text).
- Prefer minimal-scope changes; avoid refactors beyond what’s necessary to satisfy the request (and only update import paths when moving files).

## Learned Workspace Facts
- App uses Expo Router route groups like `app/(auth)` and `app/(tabs)`, with feature-local `_components/` folders for non-shared UI.
- Naming convention default: PascalCase for components (files/components), camelCase for hooks and utils (files/functions).
- Scan UI components live under `app/(tabs)/scan/_components` (post-refactor consolidation).
- Small, single-use chat leaf UI components were inlined into `app/(tabs)/chat/_components/ChatInterface.tsx`.
- UI theming uses `useTheme()` tokens (commonly `colors.textPrimary`, `colors.textSecondary`, `colors.accent`, `colors.accentMuted`, `colors.backgroundSecondary`) plus `radius` and `shadows`.
- Typography uses Poppins font family variants (e.g. `Poppins-Bold`, `Poppins-SemiBold`, `Poppins-Medium`, `Poppins-Regular`).
- Icons are sourced from `lucide-react-native`.
- Always update documentation files in the /documentation directory when making any changes that would make the documentation inaccurate.


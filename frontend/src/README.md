# Frontend Source Directory Structure

## Directory Organization

```
src/
├── app/                    # Next.js app directory containing pages and routes
├── components/             # React components organized by category
│   ├── common/            # Reusable components used across the application
│   │   ├── buttons/
│   │   ├── forms/
│   │   └── layout/
│   ├── features/          # Feature-specific components
│   │   ├── video/
│   │   ├── channel/
│   │   └── stream/
│   └── ui/               # UI components and design system elements
├── hooks/                 # Custom React hooks
├── lib/                   # Library configurations and setup
├── services/              # API services and interfaces
│   ├── api/              # API client implementations
│   └── types/            # API interface definitions
├── store/                 # State management
└── utils/                # Utility functions and helpers
```

## Guidelines

1. **Components**

   - Place reusable components in `components/common`
   - Feature-specific components go in `components/features`
   - UI components and design system elements in `components/ui`

2. **Hooks**

   - Custom React hooks should be placed in the `hooks` directory
   - Each hook should be in its own file
   - Export all hooks through an index.ts file

3. **Services**

   - API interfaces should be defined in `services/types`
   - Implementation of API calls in `services/api`
   - Keep service functions organized by feature

4. **Utils**

   - Helper functions and utilities should be placed in the `utils` directory
   - Each utility should have a specific purpose and be well-documented

5. **State Management**

   - Keep all state management logic in the `store` directory
   - Organize stores by feature or domain

6. **Code Style**
   - Use TypeScript for all new files
   - Follow consistent naming conventions
   - Document complex logic and component props

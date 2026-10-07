/* The icon registry: code and content name icons the Iconify way ("lucide:pencil"), so a profile can
   only choose what iconData.ts lists. */
import type { IconifyIcon } from '@iconify/react';
import * as data from './iconData.ts';

export const icons: Readonly<Record<keyof typeof data, IconifyIcon>> = data;

export type IconName = keyof typeof icons;

export const isIconName = (name: string): name is IconName => Object.hasOwn(icons, name);

// Simple Icons slugs drop punctuation; these are the names people know.
const brandNames: Partial<Record<IconName, string>> = {
  'simple-icons:amazonwebservices': 'AWS',
  'simple-icons:cplusplus': 'C++',
  'simple-icons:csharp': 'C#',
  'simple-icons:css': 'CSS',
  'simple-icons:dotnet': '.NET',
  'simple-icons:github': 'GitHub',
  'simple-icons:googlecloud': 'Google Cloud',
  'simple-icons:graphql': 'GraphQL',
  'simple-icons:html5': 'HTML5',
  'simple-icons:javascript': 'JavaScript',
  'simple-icons:jquery': 'jQuery',
  'simple-icons:linkedin': 'LinkedIn',
  'simple-icons:materialdesign': 'Material Design',
  'simple-icons:microsoftazure': 'Azure',
  'simple-icons:nodedotjs': 'Node.js',
  'simple-icons:npm': 'npm',
  'simple-icons:openjdk': 'Java',
  'simple-icons:php': 'PHP',
  'simple-icons:stackoverflow': 'Stack Overflow',
  'simple-icons:tailwindcss': 'Tailwind CSS',
  'simple-icons:typescript': 'TypeScript',
  'simple-icons:visualstudiocode': 'VS Code',
  'simple-icons:vuedotjs': 'Vue',
  'simple-icons:x': 'X',
};

/** A readable name for a picker: the brand's own spelling, else the icon's words capitalised. */
export const iconLabel = (name: IconName): string => {
  const words = (name.split(':')[1] ?? name).replace(/-/g, ' ');
  return brandNames[name] ?? words.charAt(0).toUpperCase() + words.slice(1);
};

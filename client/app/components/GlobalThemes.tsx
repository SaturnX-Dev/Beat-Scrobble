// import { css } from '@emotion/css';
// import { themes } from '../providers/ThemeProvider';

// export default function GlobalThemes() {
//     return (
//         <div
//             styles={css`
//                 ${themes
//                     .map(
//                       (theme) => `
//                         [data-theme=${theme.name}] {
//                             --color-bg: ${theme.bg};
//                             --color-bg-secondary: ${theme.bgSecondary};
//                             --color-bg-tertiary:${theme.bgTertiary};
//                             --color-fg: ${theme.fg};
//                             --color-fg-secondary: ${theme.fgSecondary};
//                             --color-fg-tertiary: ${theme.fgTertiary};
//                             --color-primary: ${theme.primary};
//                             --color-primary-dim: ${theme.primaryDim};
//                             --color-secondary: ${theme.secondary};
//                             --color-secondary-dim: ${theme.secondaryDim};
//                             --color-error: ${theme.error};
//                             --color-success: ${theme.success};
//                             --color-warning: ${theme.warning};
//                             --color-info: ${theme.info};
//                             --color-border: var(--color-bg-tertiary);
//                             --color-shadow: rgba(0, 0, 0, 0.5);
//                             --color-link: var(--color-primary);
//                             --color-link-hover: var(--color-primary-dim);
//                         }
//                     `).join('\n')
//                 }
//             `}
//         />
//     )
// }
import React from 'react';

// Props for any icon component
interface IconProps {
  className?: string;
}

export const UploadIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V21h18v-3.75M4.5 12.75l7.5-7.5 7.5 7.5"
    />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

export const DocumentIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

export const BrushIcon: React.FC<IconProps> = ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.998 15.998 0 011.622-3.385m5.043.025a2.25 2.25 0 013.285-2.286l.944.944a2.25 2.25 0 01-3.285 2.286m-3.285-2.286a2.25 2.25 0 00-2.286-3.285l-.944-.944a2.25 2.25 0 00-2.286 3.285m6.57 6.57a2.25 2.25 0 002.286 3.285l.944.944a2.25 2.25 0 003.285-2.286l-.944-.944a2.25 2.25 0 00-2.286-3.285m-6.57-6.57l-3.286-3.285a2.25 2.25 0 00-2.286 3.285l3.286 3.286a2.25 2.25 0 002.286-3.285z"
      />
    </svg>
  );

export const ResetIcon: React.FC<IconProps> = ({ className }) => (
<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
>
    <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l-3.181 3.183m0 0V7.5a4.5 4.5 0 016.364 0l3.181 3.183"
    />
</svg>
);

export const ClearIcon: React.FC<IconProps> = ({ className }) => (
<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
>
    <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M6 18L18 6M6 6l12 12" />
</svg>
);

export const TileIcon: React.FC<IconProps> = ({ className }) => (
<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
>
    <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15"
    />
</svg>
);

export const FillIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M1.5 3.375c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v17.25c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 20.625V3.375z" clipRule="evenodd" />
    </svg>
);

export const QuestionMarkCircleIcon: React.FC<IconProps> = ({ className }) => (
<svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}>
  <path 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" 
    />
</svg>
);

export const LanguageIcon: React.FC<IconProps> = ({ className }) => (
<svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}>
  <path 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" 
    />
</svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ className }) => (
<svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}>
  <path 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008H12v-.008z" 
    />
</svg>
);

export const DiscordIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4464.8254-.6083 1.25a18.06 18.06 0 0 0-5.4854 0 10.8968 10.8968 0 0 0-.6083-1.25.0741.0741 0 0 0-.0785-.0371 19.7363 19.7363 0 0 0-4.8851 1.5152.069.069 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0825.0825 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.227-2.0082a.0741.0741 0 0 0-.0416-.1054 12.6528 12.6528 0 0 1-1.8821-.9512.0654.0654 0 0 1-.021-.0643c.1256-.0942.2517-.1923.3718-.2914a.0741.0741 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0741.0741 0 0 1 .0776.0105c.1201.0991.2462.1972.3718.2914a.0654.0654 0 0 1-.021.0643 12.6562 12.6562 0 0 1-1.8821.9512.0741.0741 0 0 0-.0416.1054c.3539.713.7654 1.3778 1.227 2.0082a.0777.0777 0 0 0 .0842.0276c1.9516-.6067 3.94-1.5219 5.9929-3.0294a.0825.0825 0 0 0 .0312-.0561c.5004-5.177-.8382-9.6738-3.5485-13.6604a.069.069 0 0 0-.0321-.0277zM8.02 15.3312c-.8361 0-1.5118-.7336-1.5118-1.6344 0-.9008.6757-1.6344 1.5118-1.6344.8361 0 1.5118.7336 1.5118 1.6344 0 .9008-.6757 1.6344-1.5118 1.6344zm7.9548 0c-.8361 0-1.5118-.7336-1.5118-1.6344 0-.9008.6757-1.6344 1.5118-1.6344.8361 0 1.5118.7336 1.5118 1.6344 0 .9008-.6757 1.6344-1.5118 1.6344z"/>
  </svg>
);

export const LayersIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M12 4.5 2.25 9l9.75 4.5L21.75 9 12 4.5zm0 9-9.75-4.5M12 13.5l9.75-4.5m-9.75 4.5v9l-9.75-4.5v-9l9.75 4.5zm0 9v-9m0 9l9.75-4.5v-9l-9.75 4.5z" 
    />
  </svg>
);

export const EyeIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}>
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const EyeSlashIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}>
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243l-4.243-4.243" />
  </svg>
);

export const LockClosedIcon: React.FC<IconProps> = ({ className }) => (
<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}>
    <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H4.5a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
</svg>
);

export const LockOpenIcon: React.FC<IconProps> = ({ className }) => (
<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}>
    <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 11h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z M12 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M8 11V7a4 4 0 1 1 8 0"
    />
</svg>
);


export const TrashIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}>
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09.92-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

export const HandIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575V12a1.5 1.5 0 0 0 3 1.5h6.375a1.5 1.5 0 0 1 1.5 1.5v9M6.9 7.575a1.875 1.875 0 1 1-3.75 0v4.5c0 5.49 1.125 9.975 4.5 11.475m.75 0h9.75a4.5 4.5 0 0 0 4.5-4.5v-4.5" />
    </svg>
);
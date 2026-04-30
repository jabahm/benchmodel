import { cn } from '@/lib/utils';

export type ProviderLogoKey =
  | 'ollama'
  | 'vllm'
  | 'llamacpp'
  | 'lmstudio'
  | 'together'
  | 'groq'
  | 'openai_compat';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
} as const;

const iconSize = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

function tile(
  bg: string,
  fg: string,
  label: string,
  size: 'sm' | 'md' | 'lg',
  className?: string,
) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md font-bold tracking-tight',
        bg,
        fg,
        sizeClass[size],
        className,
      )}
    >
      {label}
    </div>
  );
}

export function OllamaLogo({ size = 'md', className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100',
        sizeClass[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(iconSize[size])}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M7.6 5.2 7 2.5c-.1-.4.3-.7.6-.4l1.7 1.8c.5-.2 1.1-.3 1.7-.3s1.2.1 1.7.3L14.4 2c.3-.3.7 0 .6.4l-.6 2.7c1.2.9 2 2.3 2 3.9v3.5c0 .9.3 1.7.7 2.3.3.5.1 1.1-.4 1.3l-.7.3c.2.6.3 1.2.3 1.9 0 .9-.6 1.6-1.4 1.7v.5c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-.5h-1.4v.5c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-.5H9.3v.5c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-.5C7.1 19.7 6.5 19 6.5 18c0-.7.1-1.3.3-1.9l-.7-.3c-.5-.2-.7-.8-.4-1.3.4-.6.7-1.4.7-2.3V8.7c0-1.5.8-2.9 1.9-3.8z" />
        <circle cx="9.7" cy="10" r="1" fill="#0F1007" />
        <circle cx="14.3" cy="10" r="1" fill="#0F1007" />
      </svg>
    </div>
  );
}

export function VllmLogo({ size = 'md', className }: LogoProps) {
  return tile('bg-violet-600', 'text-white', 'vL', size, className);
}

export function LlamaCppLogo({ size = 'md', className }: LogoProps) {
  return tile('bg-cyan-700', 'text-white', 'L++', size, className);
}

export function LmStudioLogo({ size = 'md', className }: LogoProps) {
  return tile('bg-fuchsia-600', 'text-white', 'LM', size, className);
}

export function TogetherLogo({ size = 'md', className }: LogoProps) {
  return tile('bg-indigo-600', 'text-white', 'T', size, className);
}

export function GroqLogo({ size = 'md', className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-orange-500 text-white',
        sizeClass[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(iconSize[size])}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
    </div>
  );
}

export function OpenAICompatLogo({ size = 'md', className }: LogoProps) {
  return tile('bg-emerald-700', 'text-white', 'API', size, className);
}

export function ProviderLogo({
  keyName,
  size = 'md',
  className,
}: {
  keyName: ProviderLogoKey;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  switch (keyName) {
    case 'ollama':
      return <OllamaLogo size={size} className={className} />;
    case 'vllm':
      return <VllmLogo size={size} className={className} />;
    case 'llamacpp':
      return <LlamaCppLogo size={size} className={className} />;
    case 'lmstudio':
      return <LmStudioLogo size={size} className={className} />;
    case 'together':
      return <TogetherLogo size={size} className={className} />;
    case 'groq':
      return <GroqLogo size={size} className={className} />;
    case 'openai_compat':
    default:
      return <OpenAICompatLogo size={size} className={className} />;
  }
}

export function detectLogoKey(name: string, type: string): ProviderLogoKey {
  const n = name.toLowerCase();
  if (type === 'ollama') return 'ollama';
  if (n.includes('vllm')) return 'vllm';
  if (n.includes('llama.cpp') || n.includes('llamacpp')) return 'llamacpp';
  if (n.includes('lm studio') || n.includes('lmstudio')) return 'lmstudio';
  if (n.includes('together')) return 'together';
  if (n.includes('groq')) return 'groq';
  return 'openai_compat';
}

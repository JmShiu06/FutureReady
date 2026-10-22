export type RaccoonArtName = 'logo' | 'waving' | 'reading' | 'sleeping' | 'star' | 'heart' | 'paw' | 'leaves' | 'sparkles' | 'tail' | 'laptop' | 'peeking';

export const raccoonSrc = (name: RaccoonArtName) => `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}images/racoon/racoon-${name}.png`;

/** Hand-drawn raccoon artwork. Decorative by default (empty alt, hidden, no pointer events). */
export function RaccoonArt({ name, size, alt = '', className = '', testId }: { name: RaccoonArtName; size: number; alt?: string; className?: string; testId?: string }) {
  const decorative = !alt;
  return <img src={raccoonSrc(name)} alt={alt} aria-hidden={decorative || undefined} width={size} height={size}
    loading={name === 'logo' ? 'eager' : 'lazy'} decoding="async" draggable={false}
    className={`raccoon-art${className ? ` ${className}` : ''}`} data-testid={testId} />;
}

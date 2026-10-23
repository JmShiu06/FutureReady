import './raccoon-loader.css';

type RaccoonLoaderProps = {
  /** `regular` shows the star-hugging raccoon artwork; `small` is a compact paw-light row for buttons/inline cues. */
  size?: 'small' | 'regular';
  className?: string;
};

const BASE = `${import.meta.env.BASE_URL}images/racoon/`;
const PAWS = [1, 2, 3, 4, 5] as const;

/**
 * Decorative raccoon loading illustration (original uploaded artwork, unchanged).
 * The five paw prints are extracted from the same artwork and light up one by one.
 * Always aria-hidden: the surrounding loading region owns the status text/role.
 */
export function RaccoonLoader({ size = 'regular', className = '' }: RaccoonLoaderProps) {
  return <span className={`raccoon-loader raccoon-loader-${size} ${className}`.trim()} aria-hidden="true">
    {size === 'regular' && <img className="raccoon-loader-art" src={`${BASE}racoon-loading-character.png`} alt="" width={560} height={520} decoding="async" draggable={false} />}
    <span className="raccoon-loader-paws">
      {PAWS.map(n => <span key={n} className="raccoon-loader-paw" style={{ ['--paw-mask' as string]: `url("${BASE}racoon-loading-paw-${n}.png")`, ['--paw-i' as string]: n - 1 }}>
        <i className="paw-glow" /><i className="paw-base" /><i className="paw-lit" />
      </span>)}
    </span>
  </span>;
}

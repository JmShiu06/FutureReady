import './raccoon-loader.css';

type RaccoonLoaderProps = {
  size?: 'small' | 'regular';
  className?: string;
};

/** A tiny, decorative helper mascot used alongside existing loading feedback. */
export function RaccoonLoader({ size = 'regular', className = '' }: RaccoonLoaderProps) {
  return <span className={`raccoon-loader raccoon-loader-${size} ${className}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 48 48" focusable="false">
      <g className="raccoon-tail-swish">
        <path className="raccoon-tail-fill" d="M32 36c6-5 14-3 14 3 0 5-7 7-12 2" />
        <path className="raccoon-tail-band" d="M36 33c2-.5 4 0 5.5 1l-2 4c-1.4-.5-2.8-.4-4 .1Z" />
        <path className="raccoon-tail-band" d="M42.6 35.5c1.4 1.1 2 2.7 1.4 4.2l-4.3-.4c.4-1.1.1-2.2-.5-3.1Z" />
      </g>
      <path className="raccoon-ear" d="M8 9 17 13 13 22 7 18Z" />
      <path className="raccoon-ear" d="m40 9-9 4 4 9 6-4Z" />
      <path className="raccoon-head" d="M10 18c1-7 7-11 14-11s13 4 14 11l2 14c-1 8-7 12-16 12S9 40 8 32Z" />
      <path className="raccoon-mask" d="M8.8 25c4-5 9-6 15.2-2 6.2-4 11.2-3 15.2 2l-2 6c-4 4-8 4-13.2 1.5C18.8 35 14.5 35 10.8 31Z" />
      <ellipse className="raccoon-muzzle" cx="24" cy="33" rx="7.4" ry="5.2" />
      <circle className="raccoon-eye" cx="17.5" cy="25.7" r="1.35" />
      <circle className="raccoon-eye" cx="30.5" cy="25.7" r="1.35" />
      <path className="raccoon-nose" d="M22.2 31.1q1.8-1.4 3.6 0l-1.8 1.6Z" />
      <path className="raccoon-smile" d="M24 32.8v1.3m0 0q-2 .9-3.3-.2m3.3.2q2 .9 3.3-.2" />
      <path className="raccoon-brow" d="M14.8 22.5q2.2-1.5 4.5-.5m9.4 0q2.3-1 4.5.5" />
    </svg>
  </span>;
}

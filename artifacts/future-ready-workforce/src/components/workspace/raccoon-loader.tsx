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
      <path className="raccoon-ear" d="M8 10c2-2 6-1 9 2 2 2 2 6 0 9-4-1-8-4-9-8-.3-1 0-2 .5-3Z" />
      <path className="raccoon-ear-inner" d="M10.6 12.2c1.7-.6 3.6.8 4.6 2.3.7 1.1.5 2.7-.3 3.8-2.3-1-4-2.7-4.6-4.8-.2-.5-.1-1 .3-1.3Z" />
      <path className="raccoon-ear" d="M40 10c-2-2-6-1-9 2-2 2-2 6 0 9 4-1 8-4 9-8 .3-1 0-2-.5-3Z" />
      <path className="raccoon-ear-inner" d="M37.4 12.2c-1.7-.6-3.6.8-4.6 2.3-.7 1.1-.5 2.7.3 3.8 2.3-1 4-2.7 4.6-4.8.2-.5.1-1-.3-1.3Z" />
      <path className="raccoon-head" d="M10 18c1-7 7-11 14-11s13 4 14 11l1.5 13c.8 9-5.8 15-15.5 15S8.2 40 8 31Z" />
      <path className="raccoon-mask" d="M8.8 25c3.5-4.7 9.7-5.5 15.2-1.8 5.5-3.7 11.7-2.9 15.2 1.8l-2 5.2c-3.2 3.2-7.5 3.6-13.2 1-5.7 2.6-10 2.2-13.2-1Z" />
      <ellipse className="raccoon-blush" cx="12.2" cy="31.3" rx="2.6" ry="1.4" />
      <ellipse className="raccoon-blush" cx="35.8" cy="31.3" rx="2.6" ry="1.4" />
      <ellipse className="raccoon-muzzle" cx="24" cy="33" rx="8.4" ry="5.8" />
      <g className="raccoon-eyes">
        <circle className="raccoon-eye" cx="17.5" cy="25.8" r="2" />
        <circle className="raccoon-eye" cx="30.5" cy="25.8" r="2" />
        <circle className="raccoon-eye-glint" cx="16.8" cy="25" r=".7" />
        <circle className="raccoon-eye-glint" cx="29.8" cy="25" r=".7" />
      </g>
      <path className="raccoon-nose" d="M21.7 31c.3-1.4 4.3-1.4 4.6 0L24 33.2Z" />
      <path className="raccoon-smile" d="M24 33v1.3m0 0q-2.1 1.4-3.7-.2m3.7.2q2.1 1.4 3.7-.2" />
      <circle className="raccoon-freckle" cx="18.6" cy="33.1" r=".45" />
      <circle className="raccoon-freckle" cx="19.8" cy="34" r=".4" />
      <circle className="raccoon-freckle" cx="29.4" cy="33.1" r=".45" />
      <circle className="raccoon-freckle" cx="28.2" cy="34" r=".4" />
      <path className="raccoon-brow" d="M14.5 22.5q2.8-1.4 5.2-.2m8.6 0q2.4-1.2 5.2.2" />
    </svg>
  </span>;
}

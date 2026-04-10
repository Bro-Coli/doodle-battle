import resultDefeatBg from './assets/result-defeat-bg.png';

export function DefeatResultPage(): React.JSX.Element {
  return (
    <>
      <img
        src={resultDefeatBg}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="relative flex w-full flex-1 flex-col items-center justify-start pt-16" />
    </>
  );
}

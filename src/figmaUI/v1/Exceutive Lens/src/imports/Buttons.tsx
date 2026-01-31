import svgPaths from "./svg-xrkbo2yamu";
import imgGlassesG11 from "figma:asset/3f76fb251e80cce61cf144dcf30292b48ca0b96a.png";

function Svgg() {
  return (
    <div className="h-[16.785px] relative shrink-0 w-[19.04px]" data-name="svgg">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.0403 16.7852">
        <g id="svgg">
          <path clipRule="evenodd" d={svgPaths.p1f5cee00} fill="var(--fill-0, #0A0A0A)" fillRule="evenodd" id="path0" />
        </g>
      </svg>
    </div>
  );
}

function Brand() {
  return (
    <div className="content-stretch flex gap-[6.381px] items-center justify-center relative shrink-0" data-name="Brand">
      <Svgg />
      <p className="font-['Red_Hat_Display:Regular',sans-serif] leading-[22.333px] not-italic relative shrink-0 text-[#0a0a0a] text-[15.952px] text-center">Even Realities</p>
    </div>
  );
}

export default function Buttons() {
  return (
    <div className="bg-[#f5f5f5] content-stretch flex flex-col gap-[16px] items-center justify-center px-[16px] py-[24px] relative rounded-[16px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] size-full" data-name="Buttons">
      <Brand />
      <div className="h-[57px] relative shrink-0 w-[176px]" data-name="Glasses g1 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgGlassesG11} />
      </div>
      <p className="font-['Red_Hat_Display:Regular',sans-serif] leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[20px] text-center">Even Realities G1</p>
    </div>
  );
}
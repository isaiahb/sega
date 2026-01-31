import svgPaths from "./svg-pxho108ts1";
import imgImage72 from "figma:asset/67b9c61f3e95ed7aee7a570afe80cbc7db18c386.png";

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

function Icon() {
  return (
    <div className="col-1 content-stretch flex items-center ml-[155px] mt-[74.33px] relative row-1" data-name="Icon">
      <p className="font-['Red_Hat_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#00b869] text-[10.033px] w-[166px] whitespace-pre-wrap">Test 123. we love testing. Mic checkTest 123. we love testing Test 123. we love testing</p>
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid items-[start] justify-items-[start] leading-[0] relative shrink-0">
      <div className="col-1 h-[241px] ml-0 mt-0 relative row-1 w-[392px]" data-name="image 72">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage72} />
      </div>
      <div className="col-1 h-[104px] ml-[138px] mt-[46.67px] relative row-1 w-[192px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 192 104">
          <ellipse cx="96" cy="52" fill="var(--fill-0, white)" id="Ellipse 2330" rx="96" ry="52" />
        </svg>
      </div>
      <Icon />
    </div>
  );
}

export default function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center relative size-full" data-name="Container">
      <Brand />
      <Group />
    </div>
  );
}
import React from "react";

interface StyledLoaderProps {
  className?: string;
}

const StyledLoader: React.FC<StyledLoaderProps> = ({ className }) => {
  return (
    <div className={className}>
      <div className="banter-loader">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="banter-loader__box" />
        ))}
      </div>
      <style>{css}</style>
    </div>
  );
};

const css = `
.banter-loader {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto;
}

.banter-loader__box {
  float: left;
  position: relative;
  width: 20px;
  height: 20px;
  margin-right: 6px;
  margin-bottom: 6px;
}

.banter-loader__box:nth-child(3n) {
  margin-right: 0;
}

.banter-loader__box:before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: #0f766e;
  border-radius: 4px;
  transform-origin: center;
}

.banter-loader__box:nth-child(1):before,
.banter-loader__box:nth-child(4):before {
  margin-left: 26px;
}

.banter-loader__box:nth-child(3):before {
  margin-top: 52px;
}

.banter-loader__box:last-child {
  margin-bottom: 0;
}

.banter-loader__box:nth-child(1) { animation: moveBox-1 3s infinite; }
.banter-loader__box:nth-child(2) { animation: moveBox-2 3s infinite; }
.banter-loader__box:nth-child(3) { animation: moveBox-3 3s infinite; }
.banter-loader__box:nth-child(4) { animation: moveBox-4 3s infinite; }
.banter-loader__box:nth-child(5) { animation: moveBox-5 3s infinite; }
.banter-loader__box:nth-child(6) { animation: moveBox-6 3s infinite; }
.banter-loader__box:nth-child(7) { animation: moveBox-7 3s infinite; }
.banter-loader__box:nth-child(8) { animation: moveBox-8 3s infinite; }
.banter-loader__box:nth-child(9) { animation: moveBox-9 3s infinite; }

@keyframes moveBox-1 {
  10% { transform: translate(-26px, 0); }
  20% { transform: translate(0, 0); }
  30% { transform: translate(0, 0); }
  40% { transform: translate(26px, 0); }
  50% { transform: translate(26px, 26px); }
  70% { transform: translate(26px, 0); }
  90% { transform: translate(-26px, 0); }
  100% { transform: translate(0, 0); }
}

@keyframes moveBox-2 {
  10% { transform: translate(0, 0); }
  20% { transform: translate(26px, 0); }
  30% { transform: translate(26px, -26px); }
  40% { transform: translate(0, -26px); }
  60% { transform: translate(26px, -26px); }
  80% { transform: translate(26px, 0); }
  100% { transform: translate(0, 0); }
}

@keyframes moveBox-3 {
  15% { transform: translate(26px, 0); }
  30% { transform: translate(26px, 26px); }
  45% { transform: translate(0, 26px); }
  60% { transform: translate(-26px, 26px); }
  75% { transform: translate(-26px, 0); }
  100% { transform: translate(0, 0); }
}

@keyframes moveBox-4 {
  10% { transform: translate(0, 0); }
  20% { transform: translate(-26px, 0); }
  30% { transform: translate(-26px, -26px); }
  40% { transform: translate(0, -26px); }
  60% { transform: translate(0, 0); }
  80% { transform: translate(26px, 0); }
  100% { transform: translate(0, 0); }
}

@keyframes moveBox-5 {
  15% { transform: translate(0, -26px); }
  30% { transform: translate(26px, -26px); }
  45% { transform: translate(26px, 0); }
  60% { transform: translate(26px, 26px); }
  75% { transform: translate(0, 26px); }
  90% { transform: translate(-26px, 26px); }
  100% { transform: translate(0, 0); }
}

@keyframes moveBox-6 {
  10% { transform: translate(0, 0); }
  20% { transform: translate(0, 26px); }
  30% { transform: translate(-26px, 26px); }
  40% { transform: translate(-26px, 0); }
  60% { transform: translate(-26px, -26px); }
  80% { transform: translate(0, -26px); }
  100% { transform: translate(0, 0); }
}

@keyframes moveBox-7 {
  10% { transform: translate(26px, 0); }
  20% { transform: translate(26px, 26px); }
  30% { transform: translate(0, 26px); }
  40% { transform: translate(-26px, 26px); }
  60% { transform: translate(0, 26px); }
  80% { transform: translate(0, 0); }
  100% { transform: translate(0, 0); }
}

@keyframes moveBox-8 {
  10% { transform: translate(0, 0); }
  20% { transform: translate(-26px, 0); }
  30% { transform: translate(-26px, -26px); }
  40% { transform: translate(0, -26px); }
  60% { transform: translate(26px, -26px); }
  80% { transform: translate(26px, 0); }
  100% { transform: translate(0, 0); }
}

@keyframes moveBox-9 {
  10% { transform: translate(-26px, 0); }
  20% { transform: translate(-26px, 0); }
  30% { transform: translate(0, 0); }
  45% { transform: translate(26px, 0); }
  60% { transform: translate(26px, -26px); }
  80% { transform: translate(0, -26px); }
  100% { transform: translate(0, 0); }
}
`;

export default StyledLoader;

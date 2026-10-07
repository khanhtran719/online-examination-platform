import { CanvasTexture, SRGBColorSpace } from "three";

export interface ScenePalette {
  paper: string;
  ink: string;
  muted: string;
  line: string;
  selected: string;
  edge: string;
  dark: string;
  accent: string;
}

export function paperTexture(palette: ScenePalette): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 660;
  canvas.height = 896;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas drawing unavailable");
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, 660, 896);
  ctx.textBaseline = "middle";
  const rounded = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
    stroke?: string,
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  ctx.fillStyle = palette.muted;
  ctx.font = '600 18px "Noto Sans", sans-serif';
  ctx.fillText("BÀI THI MẪU", 44, 59);
  ctx.textAlign = "right";
  ctx.fillText("01 / 03", 614, 59);
  ctx.textAlign = "left";
  ctx.fillStyle = palette.ink;
  ctx.font = '700 47px "Source Sans 3", sans-serif';
  ctx.fillText("Sẵn sàng cho", 44, 159);
  ctx.fillText("câu đầu tiên?", 44, 218);
  rounded(44, 270, 428, 8, 4, palette.line);
  rounded(44, 292, 329, 8, 4, palette.line);
  ["Một lựa chọn rõ ràng", "Nhịp làm bài của bạn", "Tiếp tục khám phá"].forEach((text, index) => {
    const y = 346 + index * 116,
      selected = index === 1;
    rounded(
      44,
      y,
      572,
      93,
      14,
      selected ? palette.selected : palette.paper,
      selected ? palette.edge : palette.line,
    );
    ctx.fillStyle = palette.muted;
    ctx.font = '600 21px "Noto Sans", sans-serif';
    ctx.fillText(String.fromCharCode(65 + index), 67, y + 46);
    ctx.fillStyle = palette.ink;
    ctx.font = '24px "Noto Sans", sans-serif';
    ctx.fillText(text, 109, y + 46);
    if (selected) {
      ctx.beginPath();
      ctx.arc(578, y + 46, 12, 0, Math.PI * 2);
      ctx.fillStyle = palette.dark;
      ctx.fill();
      ctx.strokeStyle = palette.paper;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(572, y + 46);
      ctx.lineTo(576, y + 50);
      ctx.lineTo(584, y + 42);
      ctx.stroke();
    }
  });
  ctx.fillStyle = palette.muted;
  ctx.font = '19px "Noto Sans", sans-serif';
  ctx.fillText("ExamPlatform", 44, 814);
  rounded(479, 788, 137, 48, 13, palette.dark);
  ctx.fillStyle = palette.paper;
  ctx.font = '18px "Noto Sans", sans-serif';
  ctx.fillText("Tiếp theo", 493, 812);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

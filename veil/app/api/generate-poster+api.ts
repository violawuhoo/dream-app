import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

interface PosterRequest {
  title: string;
  narrative: string;
  tarotCard?: { name: string } | null;
  emotions?: string[];
  date: string;
}

function randomStars(count: number) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.floor(Math.random() * 1080),
      y: Math.floor(Math.random() * 1920),
      r: 2 + Math.floor(Math.random() * 3),
      opacity: 0.1 + Math.random() * 0.15,
    });
  }
  return stars;
}

function el(type: string, props: Record<string, unknown>) {
  return { type, key: null, props };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PosterRequest;
    const { title, narrative, tarotCard, date } = body;

    const stars = randomStars(12);
    const narrativePreview = (narrative ?? "").slice(0, 120);
    const tarotLineY = Math.floor(1920 * 0.68);

    const starEls = stars.map((s) =>
      el("div", {
        style: {
          position: "absolute",
          left: s.x,
          top: s.y,
          width: s.r * 2,
          height: s.r * 2,
          borderRadius: s.r,
          backgroundColor: "white",
          opacity: s.opacity,
        },
      }),
    );

    const tarotEls = tarotCard
      ? [
          el("div", {
            style: {
              position: "absolute",
              top: tarotLineY,
              left: 480,
              width: 120,
              height: 1,
              backgroundColor: "#C9A84C",
            },
          }),
          el("div", {
            style: {
              position: "absolute",
              top: tarotLineY + 20,
              left: 90,
              right: 90,
              color: "#C9A84C",
              fontSize: 22,
              letterSpacing: 3,
              textAlign: "center",
            },
            children: tarotCard.name.toUpperCase(),
          }),
        ]
      : [];

    const root = el("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1920,
        backgroundColor: "#0A0A0F",
        position: "relative",
        fontFamily: "sans-serif",
      },
      children: [
        ...starEls,
        el("div", {
          style: { position: "absolute", top: 80, left: 80, color: "white", fontSize: 28, letterSpacing: 6 },
          children: "Veil",
        }),
        el("div", {
          style: { position: "absolute", top: 84, right: 80, color: "#55556A", fontSize: 18 },
          children: date,
        }),
        el("div", {
          style: {
            position: "absolute",
            top: Math.floor(1920 * 0.35),
            left: 90,
            right: 90,
            color: "white",
            fontSize: 52,
            textAlign: "center",
          },
          children: title ?? "Dream",
        }),
        el("div", {
          style: {
            position: "absolute",
            top: Math.floor(1920 * 0.35) + 80,
            left: 130,
            right: 130,
            color: "#8888AA",
            fontSize: 24,
            lineHeight: 1.6,
            textAlign: "center",
          },
          children: narrativePreview,
        }),
        ...tarotEls,
        el("div", {
          style: { position: "absolute", bottom: 80, left: 0, right: 0, color: "#2A2A3F", fontSize: 14, textAlign: "center" },
          children: "veil",
        }),
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svg = await satori(root as any, { width: 1080, height: 1920, fonts: [] });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1080 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(pngBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(pngBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("generate-poster error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

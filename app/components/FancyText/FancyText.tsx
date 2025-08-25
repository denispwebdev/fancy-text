"use client";

import React, { useRef, useEffect, useState } from "react";
import { MdCelebration } from "react-icons/md";

function generateBalloonPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x - size / 2,
    y - size / 2,
    x - size / 4,
    y - size,
    x,
    y - size
  );
  ctx.bezierCurveTo(x + size / 4, y - size, x + size / 2, y - size / 2, x, y);
}

export default function FancyText() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userText, setUserText] = useState("");
  const [displayText, setDisplayText] = useState(["GLOW", "CELEBRATE"]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let hw = w / 2;
    let hh = h / 2;

    function getScaledOptions() {
      return {
        strings: displayText,
        charSize: Math.max(30, w / 30),
        charSpacing: Math.max(30, w / 25),
        lineHeight: Math.max(40, w / 25),

        cx: w / 2,
        cy: h / 2,

        fireworkPrevPoints: 10,
        fireworkBaseLineWidth: 5,
        fireworkAddedLineWidth: 8,
        fireworkSpawnTime: 200,
        fireworkBaseReachTime: 30,
        fireworkAddedReachTime: 30,
        fireworkCircleBaseSize: 20,
        fireworkCircleAddedSize: 10,
        fireworkCircleBaseTime: 30,
        fireworkCircleAddedTime: 30,
        fireworkCircleFadeBaseTime: 10,
        fireworkCircleFadeAddedTime: 5,
        fireworkBaseShards: 5,
        fireworkAddedShards: 5,
        fireworkShardPrevPoints: 3,
        fireworkShardBaseVel: 4,
        fireworkShardAddedVel: 2,
        fireworkShardBaseSize: 3,
        fireworkShardAddedSize: 3,
        gravity: 0.1,
        upFlow: -0.1,
        letterContemplatingWaitTime: 360,
        balloonSpawnTime: 20,
        balloonBaseInflateTime: 10,
        balloonAddedInflateTime: 10,
        balloonBaseSize: 20,
        balloonAddedSize: 20,
        balloonBaseVel: 0.4,
        balloonAddedVel: 0.4,
        balloonBaseRadian: -(Math.PI / 2 - 0.5),
        balloonAddedRadian: -1,
      };
    }

    let opts = getScaledOptions();

    ctx.font = `bold ${opts.charSize}px 'Arial', sans-serif`;

    const calc = {
      totalWidth:
        opts.charSpacing *
        Math.max(opts.strings[0].length, opts.strings[1].length),
    };

    const Tau = Math.PI * 2;
    const TauQuarter = Tau / 4;

    type Point = [number, number, number?];

    // Enhanced glow drawing function
    function drawGlowText(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      color: string,
      glowColor: string,
      glowRadius: number = 20
    ) {
      // Save the current context state
      ctx.save();

      // Create multiple glow layers for enhanced effect
      const glowLayers = [
        { blur: glowRadius * 1.5, alpha: 0.1 },
        { blur: glowRadius, alpha: 0.3 },
        { blur: glowRadius * 0.5, alpha: 0.5 },
        { blur: glowRadius * 0.25, alpha: 0.7 },
      ];

      // Draw glow layers
      glowLayers.forEach((layer) => {
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = layer.blur;
        ctx.globalAlpha = layer.alpha;
        ctx.fillStyle = glowColor;
        ctx.fillText(text, x, y);
        ctx.restore();
      });

      // Draw the main text
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowRadius * 0.3;
      ctx.fillText(text, x, y);
      ctx.restore();

      ctx.restore();
    }

    class Shard {
      x: number;
      y: number;
      vx: number;
      vy: number;
      prevPoints: Point[];
      color: string;
      alive: boolean;
      size: number;

      constructor(x: number, y: number, vx: number, vy: number, color: string) {
        const vel =
          opts.fireworkShardBaseVel +
          opts.fireworkShardAddedVel * Math.random();
        this.vx = vx * vel;
        this.vy = vy * vel;
        this.x = x;
        this.y = y;
        this.prevPoints = [[x, y]];
        this.color = color;
        this.alive = true;
        this.size =
          opts.fireworkShardBaseSize +
          opts.fireworkShardAddedSize * Math.random();
      }

      step(ctx: CanvasRenderingContext2D) {
        this.x += this.vx;
        this.y += this.vy += opts.gravity;

        if (this.prevPoints.length > opts.fireworkShardPrevPoints) {
          this.prevPoints.shift();
        }

        this.prevPoints.push([this.x, this.y]);

        const lineWidthProportion = this.size / this.prevPoints.length;

        for (let k = 0; k < this.prevPoints.length - 1; ++k) {
          const point = this.prevPoints[k];
          const point2 = this.prevPoints[k + 1];

          ctx.strokeStyle = this.color.replace(
            "alp",
            (k / this.prevPoints.length).toString()
          );
          ctx.lineWidth = k * lineWidthProportion;
          ctx.beginPath();
          ctx.moveTo(point[0], point[1]);
          ctx.lineTo(point2[0], point2[1]);
          ctx.stroke();
        }

        if (this.prevPoints[0][1] > hh) this.alive = false;
      }
    }

    class Letter {
      char: string;
      x: number;
      y: number;
      originalX: number;
      originalY: number;
      dx: number;
      dy: number;
      fireworkDy: number;
      color: string;
      glowColor: string;
      lightAlphaColor: string;
      lightColor: string;
      alphaColor: string;
      phase: "firework" | "contemplate" | "balloon" | "falling" | "done";
      tick: number;
      spawned: boolean;
      spawningTime: number;
      reachTime: number;
      lineWidth: number;
      prevPoints: Point[];
      shards: Shard[] = [];
      circleFinalSize: number = 0;
      circleCompleteTime: number = 0;
      circleFadeTime: number = 0;
      circleCreating: boolean = false;
      circleFading: boolean = false;
      tick2: number = 0;
      spawning: boolean = false;
      spawnTime: number = 0;
      inflating: boolean = false;
      inflateTime: number = 0;
      size: number = 0;
      cx: number = 0;
      cy: number = 0;
      vx: number = 0;
      vy: number = 0;
      fallOpacity: number = 1;
      fallStartTime: number = 0;
      fallX: number = 0;
      fallY: number = 0;
      fallVx: number = 0;
      fallVy: number = 0;

      constructor(char: string, x: number, y: number) {
        this.char = char;
        this.x = x;
        this.y = y;
        this.originalX = x;
        this.originalY = y;

        this.dx = -ctx!.measureText(char).width / 2;
        this.dy = +opts.charSize / 2;

        this.fireworkDy = this.y - hh;

        const hue = (x / calc.totalWidth) * 360;

        this.color = `hsl(${hue},90%,70%)`;
        this.glowColor = `hsl(${hue},100%,85%)`;
        this.lightAlphaColor = `hsla(${hue},90%,light%,alp)`;
        this.lightColor = `hsl(${hue},90%,light%)`;
        this.alphaColor = `hsla(${hue},90%,70%,alp)`;

        this.phase = "firework";
        this.tick = 0;
        this.spawned = false;
        this.spawningTime = (opts.fireworkSpawnTime * Math.random()) | 0;
        this.reachTime =
          (opts.fireworkBaseReachTime +
            opts.fireworkAddedReachTime * Math.random()) |
          0;
        this.lineWidth =
          opts.fireworkBaseLineWidth +
          opts.fireworkAddedLineWidth * Math.random();
        this.prevPoints = [[0, hh, 0]];
      }

      reset() {
        this.phase = "firework";
        this.tick = 0;
        this.spawned = false;
        this.spawningTime = (opts.fireworkSpawnTime * Math.random()) | 0;
        this.reachTime =
          (opts.fireworkBaseReachTime +
            opts.fireworkAddedReachTime * Math.random()) |
          0;
        this.lineWidth =
          opts.fireworkBaseLineWidth +
          opts.fireworkAddedLineWidth * Math.random();
        this.prevPoints = [[0, hh, 0]];

        // Restore original positions
        this.x = this.originalX;
        this.y = this.originalY;
        this.fallOpacity = 1;
      }

      step(ctx: CanvasRenderingContext2D) {
        if (this.phase === "firework") {
          if (!this.spawned) {
            ++this.tick;
            if (this.tick >= this.spawningTime) {
              this.tick = 0;
              this.spawned = true;
            }
          } else {
            ++this.tick;

            const linearProportion = this.tick / this.reachTime;
            const armonicProportion = Math.sin(linearProportion * TauQuarter);

            const x = linearProportion * this.x;
            const y = hh + armonicProportion * this.fireworkDy;

            if (this.prevPoints.length > opts.fireworkPrevPoints)
              this.prevPoints.shift();

            this.prevPoints.push([x, y, linearProportion * this.lineWidth]);

            const lineWidthProportion = 1 / (this.prevPoints.length - 1);

            for (let i = 1; i < this.prevPoints.length; ++i) {
              const point = this.prevPoints[i]!;
              const point2 = this.prevPoints[i - 1]!;

              ctx.strokeStyle = this.alphaColor.replace(
                "alp",
                (i / this.prevPoints.length).toString()
              );
              ctx.lineWidth = point[2]! * lineWidthProportion * i;
              ctx.beginPath();
              ctx.moveTo(point[0], point[1]);
              ctx.lineTo(point2[0], point2[1]);
              ctx.stroke();
            }

            if (this.tick >= this.reachTime) {
              this.phase = "contemplate";

              this.circleFinalSize =
                opts.fireworkCircleBaseSize +
                opts.fireworkCircleAddedSize * Math.random();
              this.circleCompleteTime =
                (opts.fireworkCircleBaseTime +
                  opts.fireworkCircleAddedTime * Math.random()) |
                0;

              this.circleCreating = true;
              this.circleFading = false;

              this.circleFadeTime =
                (opts.fireworkCircleFadeBaseTime +
                  opts.fireworkCircleFadeAddedTime * Math.random()) |
                0;

              this.tick = 0;
              this.tick2 = 0;

              this.shards = [];
              const shardCount =
                (opts.fireworkBaseShards +
                  opts.fireworkAddedShards * Math.random()) |
                0;
              const angle = Tau / shardCount;
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);

              let x = 1,
                y = 0;

              for (let i = 0; i < shardCount; i++) {
                const x1 = x;
                x = x * cos - y * sin;
                y = y * cos + x1 * sin;

                this.shards.push(
                  new Shard(this.x, this.y, x, y, this.alphaColor)
                );
              }
            }
          }
        } else if (this.phase === "contemplate") {
          this.tick++;

          if (this.circleCreating) {
            this.tick2++;
            const proportion = this.tick2 / this.circleCompleteTime;
            const armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;

            ctx.beginPath();
            ctx.fillStyle = this.lightAlphaColor
              .replace("light", String(50 + 50 * proportion))
              .replace("alp", proportion.toString());
            ctx.arc(this.x, this.y, armonic * this.circleFinalSize, 0, Tau);
            ctx.fill();

            if (this.tick2 > this.circleCompleteTime) {
              this.tick2 = 0;
              this.circleCreating = false;
              this.circleFading = true;
            }
          } else if (this.circleFading) {
            // Enhanced glow text rendering
            drawGlowText(
              ctx,
              this.char,
              this.x + this.dx,
              this.y + this.dy,
              this.lightColor.replace("light", "80"),
              this.glowColor,
              15
            );

            this.tick2++;
            const proportion = this.tick2 / this.circleFadeTime;
            const armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;

            ctx.beginPath();
            ctx.fillStyle = this.lightAlphaColor
              .replace("light", "100")
              .replace("alp", (1 - armonic).toString());
            ctx.arc(this.x, this.y, this.circleFinalSize, 0, Tau);
            ctx.fill();

            if (this.tick2 >= this.circleFadeTime) this.circleFading = false;
          } else {
            // Enhanced glow text rendering for contemplation phase
            drawGlowText(
              ctx,
              this.char,
              this.x + this.dx,
              this.y + this.dy,
              this.lightColor.replace("light", "85"),
              this.glowColor,
              20
            );
          }

          for (let i = 0; i < this.shards.length; i++) {
            this.shards[i].step(ctx);
            if (!this.shards[i].alive) {
              this.shards.splice(i, 1);
              i--;
            }
          }

          if (this.tick > opts.letterContemplatingWaitTime) {
            this.phase = "balloon";
            this.tick = 0;
            this.spawning = true;
            this.spawnTime = (opts.balloonSpawnTime * Math.random()) | 0;
            this.inflating = false;
            this.inflateTime =
              (opts.balloonBaseInflateTime +
                opts.balloonAddedInflateTime * Math.random()) |
              0;
            this.size =
              (opts.balloonBaseSize + opts.balloonAddedSize * Math.random()) |
              0;

            const rad =
              opts.balloonBaseRadian + opts.balloonAddedRadian * Math.random();
            const vel =
              opts.balloonBaseVel + opts.balloonAddedVel * Math.random();

            this.vx = Math.cos(rad) * vel;
            this.vy = Math.sin(rad) * vel;
          }
        } else if (this.phase === "balloon") {
          ctx.strokeStyle = this.lightColor.replace("light", "80");

          if (this.spawning) {
            this.tick++;
            // Enhanced glow text for spawning phase
            drawGlowText(
              ctx,
              this.char,
              this.x + this.dx,
              this.y + this.dy,
              this.lightColor.replace("light", "80"),
              this.glowColor,
              12
            );

            if (this.tick >= this.spawnTime) {
              this.tick = 0;
              this.spawning = false;
              this.inflating = true;
            }
          } else if (this.inflating) {
            this.tick++;
            const proportion = this.tick / this.inflateTime;
            const x = (this.cx = this.x);
            const y = (this.cy = this.y - this.size * proportion);

            ctx.fillStyle = this.alphaColor.replace(
              "alp",
              proportion.toString()
            );
            ctx.beginPath();
            generateBalloonPath(ctx, x, y, this.size * proportion);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, this.y);
            ctx.stroke();

            // Enhanced glow text for inflating phase
            drawGlowText(
              ctx,
              this.char,
              this.x + this.dx,
              this.y + this.dy,
              this.lightColor.replace("light", "80"),
              this.glowColor,
              10
            );

            if (this.tick >= this.inflateTime) {
              this.tick = 0;
              this.inflating = false;
            }
          } else {
            this.cx += this.vx;
            this.cy += this.vy += opts.upFlow;

            ctx.fillStyle = this.color;
            ctx.beginPath();
            generateBalloonPath(ctx, this.cx, this.cy, this.size);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(this.cx, this.cy);
            ctx.lineTo(this.cx, this.cy + this.size);
            ctx.stroke();

            // Enhanced glow text for floating phase
            drawGlowText(
              ctx,
              this.char,
              this.cx + this.dx,
              this.cy + this.dy + this.size,
              this.lightColor.replace("light", "85"),
              this.glowColor,
              15
            );

            if (this.cy + this.size < -hh || this.cx < -hw || this.cy > hw) {
              this.phase = "done";
            }
          }
        } else if (this.phase === "falling") {
          // Use separate fall coordinates to avoid corrupting original position
          this.fallX += this.fallVx;
          this.fallY += this.fallVy;
          this.fallVy += opts.gravity * 2; // Stronger gravity for realistic fall

          // Add air resistance to horizontal movement
          this.fallVx *= 0.99;

          // Calculate opacity fade based on time and position
          const timeAlive = this.tick - this.fallStartTime;
          this.fallOpacity = Math.max(
            0,
            1 - timeAlive / 120 - this.fallY / (h * 0.6)
          );

          // Enhanced glow text for falling phase with fading
          const fallColor = this.lightColor
            .replace("light", "70")
            .replace(")", `,${this.fallOpacity})`)
            .replace("hsl", "hsla");

          const fallGlowColor = this.glowColor
            .replace(")", `,${this.fallOpacity * 0.7})`)
            .replace("hsl", "hsla");

          drawGlowText(
            ctx,
            this.char,
            this.fallX + this.dx,
            this.fallY + this.dy,
            fallColor,
            fallGlowColor,
            8 * this.fallOpacity
          );

          this.tick++;

          // Remove when fully faded or off screen
          if (this.fallOpacity <= 0 || this.fallY > hh + 100) {
            this.phase = "done";
          }
        }
      }
    }

    // Interactive Sparkle class for click effects
    class InteractiveSpark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
      alive: boolean;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;

        const angle = Math.random() * Tau;
        const speed = 2 + Math.random() * 4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.maxLife = this.life = 30 + Math.random() * 30;
        this.size = 2 + Math.random() * 3;

        // Use same color logic as letters
        const hue = Math.random() * 360;
        this.color = `hsl(${hue},80%,60%)`;
        this.alive = true;
      }

      step(ctx: CanvasRenderingContext2D) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life--;

        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color
          .replace(")", `,${alpha})`)
          .replace("hsl", "hsla");

        // Draw sparkle as a star shape
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 4);
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -this.size * alpha);
        }
        ctx.stroke();
        ctx.restore();

        if (this.life <= 0) this.alive = false;
      }
    }

    // Floating Heart class
    class FloatingHeart {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
      alive: boolean;
      rotation: number;
      rotationSpeed: number;

      constructor() {
        // Spawn randomly across full width
        this.x = -hw + Math.random() * w;
        this.y = hh + Math.random() * 100; // spawn from bottom area

        this.vx = (Math.random() - 0.5) * 1;
        this.vy = -0.3 - Math.random() * 0.7; // float upward

        this.maxLife = this.life = 300 + Math.random() * 200;
        this.size = 6 + Math.random() * 12; // varied sizes

        // Pink/red hearts to match romantic theme
        const hue = 330 + Math.random() * 60; // pink to red range
        this.color = `hsl(${hue},70%,60%)`;
        this.alive = true;

        this.rotation = Math.random() * Tau;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      }

      step(ctx: CanvasRenderingContext2D) {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.rotation += this.rotationSpeed;

        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color
          .replace(")", `,${alpha})`)
          .replace("hsl", "hsla");

        // Draw heart shape
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.size / 10, this.size / 10);

        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.bezierCurveTo(-5, -2, -10, 1, 0, 10);
        ctx.bezierCurveTo(10, 1, 5, -2, 0, 3);
        ctx.fill();

        ctx.restore();

        if (this.life <= 0 || this.y < -hh) this.alive = false;
      }
    }

    // Confetti class for balloon explosions
    class Confetti {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
      alive: boolean;
      rotation: number;
      rotationSpeed: number;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;

        const angle = Math.random() * Tau;
        const speed = 3 + Math.random() * 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 2; // upward bias

        this.maxLife = this.life = 60 + Math.random() * 40;
        this.size = 3 + Math.random() * 4;
        this.color = color;
        this.alive = true;

        this.rotation = Math.random() * Tau;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
      }

      step(ctx: CanvasRenderingContext2D) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // gravity
        this.life--;
        this.rotation += this.rotationSpeed;

        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color
          .replace(")", `,${alpha})`)
          .replace("hsl", "hsla");

        // Draw confetti as small rectangles
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();

        if (this.life <= 0) this.alive = false;
      }
    }

    // Function to regenerate letters whenever screen or opts change
    function createLetters() {
      const arr: Letter[] = [];
      for (let i = 0; i < opts.strings.length; ++i) {
        for (let j = 0; j < opts.strings[i].length; ++j) {
          arr.push(
            new Letter(
              opts.strings[i][j],
              j * opts.charSpacing +
                opts.charSpacing / 2 -
                (opts.strings[i].length * opts.charSpacing) / 2,
              i * opts.lineHeight +
                opts.lineHeight / 2 -
                (opts.strings.length * opts.lineHeight) / 2
            )
          );
        }
      }
      return arr;
    }

    let letters: Letter[] = createLetters();
    const interactiveSparks: InteractiveSpark[] = [];
    const floatingHearts: FloatingHeart[] = [];
    const confetti: Confetti[] = [];
    let heartSpawnTimer = 0;

    // Click handler for both interactive sparks and balloon popping
    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left - hw;
      const clickY = event.clientY - rect.top - hh;

      // Check if click hits any balloon in balloon phase
      let balloonClicked = false;
      for (const letter of letters) {
        if (
          letter.phase === "balloon" &&
          !letter.spawning &&
          !letter.inflating
        ) {
          // Check if click is within balloon bounds
          const dx = clickX - letter.cx;
          const dy = clickY - letter.cy;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < letter.size) {
            balloonClicked = true;

            // Create confetti explosion
            for (let i = 0; i < 15; i++) {
              confetti.push(new Confetti(letter.cx, letter.cy, letter.color));
            }

            // Make letter fall down with realistic physics
            letter.phase = "falling";
            letter.fallVx = (Math.random() - 0.5) * 3; // Random horizontal drift
            letter.fallVy = 0.5 + Math.random() * 1.5; // Initial downward velocity
            letter.fallOpacity = 1;
            letter.fallStartTime = letter.tick;
            // Start falling from balloon position
            letter.fallX = letter.cx;
            letter.fallY = letter.cy + letter.size;

            break;
          }
        }
      }

      // If no balloon clicked, create sparks
      if (!balloonClicked) {
        for (let i = 0; i < 8; i++) {
          interactiveSparks.push(new InteractiveSpark(clickX, clickY));
        }
      }
    };

    canvas.addEventListener("click", handleClick);

    // Animation loop
    function anim() {
      window.requestAnimationFrame(anim);

      // Dark gradient background for better glow visibility
      const gradient = ctx!.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#000");
      gradient.addColorStop(1, "#1f1f1f");

      ctx!.fillStyle = gradient;
      ctx!.fillRect(0, 0, w, h);

      ctx!.save();
      ctx!.translate(hw, hh);

      let done = true;
      for (let l = 0; l < letters.length; ++l) {
        letters[l].step(ctx!);
        if (letters[l].phase !== "done") done = false;
      }

      // Update and render interactive sparks
      for (let i = interactiveSparks.length - 1; i >= 0; i--) {
        interactiveSparks[i].step(ctx!);
        if (!interactiveSparks[i].alive) {
          interactiveSparks.splice(i, 1);
        }
      }

      // Spawn floating hearts periodically
      heartSpawnTimer++;
      if (heartSpawnTimer >= 60) {
        // Every 60 frames (~1 second)
        heartSpawnTimer = 0;
        if (floatingHearts.length < 8) {
          // Limit max hearts
          floatingHearts.push(new FloatingHeart());
        }
      }

      // Update and render floating hearts
      for (let i = floatingHearts.length - 1; i >= 0; i--) {
        floatingHearts[i].step(ctx!);
        if (!floatingHearts[i].alive) {
          floatingHearts.splice(i, 1);
        }
      }

      // Update and render confetti
      for (let i = confetti.length - 1; i >= 0; i--) {
        confetti[i].step(ctx!);
        if (!confetti[i].alive) {
          confetti.splice(i, 1);
        }
      }

      ctx!.restore();

      if (done) letters.forEach((l) => l.reset());
    }

    anim();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      hw = w / 2;
      hh = h / 2;

      opts = getScaledOptions();
      ctx.font = `bold ${opts.charSize}px 'Arial', sans-serif`;

      letters = createLetters(); // regenerate positions
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("click", handleClick);
    };
  }, [displayText]);

  return (
    <>
      <div className="input">
        <input
          type="text"
          placeholder="Enter your text..."
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
        />
        <button
          onClick={() => {
            if (userText.trim() !== "") {
              // Split by spaces -> each word = 1 line
              const words = userText.trim().split(/\s+/);
              setDisplayText(words);
              setUserText("");
            }
          }}
        >
          <MdCelebration />
        </button>
      </div>
      <canvas ref={canvasRef} className="fancy-text" />
    </>
  );
}

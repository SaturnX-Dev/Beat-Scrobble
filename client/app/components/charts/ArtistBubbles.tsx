import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { imageUrl } from "api/api";
import Matter from "matter-js";

interface BubbleItem {
    id: number;
    name: string;
    image?: string;
    listen_count: number;
}

interface ArtistBubblesProps {
    items: BubbleItem[];
    maxItems?: number;
}

export default function ArtistBubbles({ items, maxItems = 15 }: ArtistBubblesProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<any>(null); // To store engine/runner cleanup info
    const bubbleRefs = useRef<{ [key: number]: SVGGElement | null }>({});
    const navigate = useNavigate();
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    // Initial data setup
    const displayItems = items.slice(0, maxItems);
    const maxCount = Math.max(...displayItems.map(i => i.listen_count), 1);
    const minSize = 40; // increased min size for better visibility
    const maxSize = 90;

    useEffect(() => {
        if (!containerRef.current || !displayItems.length) return;

        // --- Physics Setup ---
        const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            Bodies = Matter.Bodies,
            Composite = Matter.Composite,
            Mouse = Matter.Mouse,
            MouseConstraint = Matter.MouseConstraint,
            Events = Matter.Events;

        const engine = Engine.create();
        const world = engine.world;

        // Disable gravity for "floating" effect, or keep it very low
        engine.gravity.y = 0;
        engine.gravity.x = 0;

        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        // Walls to keep bubbles in
        const wallThickness = 60;
        const walls = [
            Bodies.rectangle(containerWidth / 2, -wallThickness / 2, containerWidth * 2, wallThickness, { isStatic: true, render: { visible: false } }), // Top
            Bodies.rectangle(containerWidth / 2, containerHeight + wallThickness / 2, containerWidth * 2, wallThickness, { isStatic: true, render: { visible: false } }), // Bottom
            Bodies.rectangle(containerWidth + wallThickness / 2, containerHeight / 2, wallThickness, containerHeight * 2, { isStatic: true, render: { visible: false } }), // Right
            Bodies.rectangle(-wallThickness / 2, containerHeight / 2, wallThickness, containerHeight * 2, { isStatic: true, render: { visible: false } }) // Left
        ];
        Composite.add(world, walls);

        // Artist Bubbles
        const bodies = displayItems.map((item, index) => {
            const normalizedCount = item.listen_count / maxCount;
            const size = minSize + normalizedCount * (maxSize - minSize);
            const radius = size / 2;

            // Random initial position within bounds
            const x = Math.random() * (containerWidth - 100) + 50;
            const y = Math.random() * (containerHeight - 100) + 50;

            const body = Bodies.circle(x, y, radius, {
                restitution: 0.9, // Bounciness
                friction: 0.005,
                frictionAir: 0.02, // Air resistance for floating feel
                density: 0.04,
                label: `artist-${item.id}`
            });

            // Store original radius for hover scaling later if needed
            (body as any).plugin = { item, radius };

            return body;
        });

        Composite.add(world, bodies);

        // Mouse Interaction
        const mouse = Mouse.create(containerRef.current);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });

        // Double click detection variables
        let lastClickTime = 0;
        let lastClickedBodyId: number | null = null;

        // Custom double click logic using Matter events
        Events.on(mouseConstraint, "mousedown", (event) => {
            const body = mouseConstraint.body;
            if (body) {
                const now = Date.now();
                if (lastClickedBodyId === body.id && now - lastClickTime < 300) {
                    // Double click detected!
                    const itemId = (body as any).plugin?.item?.id;
                    if (itemId) {
                        navigate(`/artist/${itemId}`);
                    }
                }
                lastClickedBodyId = body.id;
                lastClickTime = now;
            }
        });

        // Handle hovering via checking mouse position vs bodies for tooltip
        Events.on(engine, "beforeUpdate", () => {
            // Add gentle ambient motion
            bodies.forEach(body => {
                // Push gently towards center if too far out (soft bounds helper) or just random noise
                // Actually frictionAir handles the slowing down, let's just add slight random force for "floating"
                if (Math.random() < 0.05) {
                    Matter.Body.applyForce(body, body.position, {
                        x: (Math.random() - 0.5) * 0.0005,
                        y: (Math.random() - 0.5) * 0.0005
                    });
                }
            });
        });

        Composite.add(world, mouseConstraint);

        // Sync Physics with DOM
        const runner = Runner.create();

        // Render loop to update DOM elements
        let animationFrameId: number = 0;

        const updateDOM = () => {
            bodies.forEach(body => {
                const itemId = (body as any).plugin.item.id;
                const el = bubbleRefs.current[itemId];
                if (el) {
                    const { x, y } = body.position;
                    // Update group transform
                    el.setAttribute('transform', `translate(${x}, ${y})`);
                }
            });
            animationFrameId = requestAnimationFrame(updateDOM);
        };

        Runner.run(runner, engine);
        updateDOM();

        // Cleanup
        sceneRef.current = { engine, runner, animationFrameId };

        return () => {
            Runner.stop(runner);
            Engine.clear(engine);
            cancelAnimationFrame(animationFrameId);
            Composite.clear(world, false, true);
        };
    }, [displayItems, maxItems, navigate]);


    if (!displayItems.length) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-[var(--color-fg-tertiary)]">
                <span className="text-sm">No artist data</span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-square max-h-[400px] bg-[var(--color-bg-secondary)]/30 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        >
            {/* Ambient glow background */}
            <div className="absolute inset-0 bg-gradient-radial from-[var(--color-primary)]/5 to-transparent pointer-events-none" />

            <svg className="w-full h-full pointer-events-none">
                <defs>
                    {/* Definitions for patterns/images */}
                    {displayItems.map(item => {
                        const normalizedCount = item.listen_count / maxCount;
                        const size = minSize + normalizedCount * (maxSize - minSize);
                        const radius = size / 2;

                        return (
                            <pattern
                                key={`img-pattern-${item.id}`}
                                id={`img-pattern-${item.id}`}
                                patternUnits="objectBoundingBox"
                                width="1"
                                height="1"
                                viewBox="0 0 1 1"
                                preserveAspectRatio="xMidYMid slice"
                            >
                                {item.image && (
                                    <image
                                        href={imageUrl(item.image, "large")}
                                        width="1"
                                        height="1"
                                        preserveAspectRatio="xMidYMid slice"
                                    />
                                )}
                            </pattern>
                        );
                    })}
                </defs>

                {displayItems.map((item) => {
                    const normalizedCount = item.listen_count / maxCount;
                    const size = minSize + normalizedCount * (maxSize - minSize);
                    const radius = size / 2;

                    return (
                        <g
                            key={item.id}
                            ref={(el) => { bubbleRefs.current[item.id] = el; }}
                        // Initial position off-screen or rendered by physics immediately
                        >
                            {/* Shadow/Glow */}
                            <circle
                                r={radius}
                                fill="black"
                                opacity="0.2"
                                style={{ filter: 'blur(3px)', transform: 'translateY(2px)' }}
                            />

                            {/* Main Bubble */}
                            <circle
                                r={radius}
                                fill={item.image ? `url(#img-pattern-${item.id})` : "var(--color-bg-tertiary)"}
                                stroke="var(--color-bg-secondary)"
                                strokeWidth="2"
                                className="transition-all duration-300 pointer-events-auto"
                                style={{
                                    filter: hoveredId === item.id ? 'brightness(1.1)' : 'none'
                                }}
                                onMouseEnter={() => setHoveredId(item.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            />

                            {/* Inner shine/highlight */}
                            <circle
                                r={radius}
                                fill="none"
                                stroke="white"
                                strokeWidth="1"
                                opacity="0.15"
                                className="pointer-events-none"
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip Overlay */}
            {hoveredId && displayItems.find(b => b.id === hoveredId) && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--color-bg-secondary)]/90 backdrop-blur border border-[var(--color-bg-tertiary)] rounded-full px-4 py-2 shadow-xl z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-[var(--color-fg)] whitespace-nowrap">
                            {displayItems.find(b => b.id === hoveredId)?.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-primary)] font-bold">
                            {displayItems.find(b => b.id === hoveredId)?.listen_count.toLocaleString()} plays
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

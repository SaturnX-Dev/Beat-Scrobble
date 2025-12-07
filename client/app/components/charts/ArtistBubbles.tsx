import { useEffect, useRef, useState, useMemo, memo, useId } from "react";
import { useNavigate } from "react-router";
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

const ArtistBubbles = memo(function ArtistBubbles({ items, maxItems = 15 }: ArtistBubblesProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<any>(null);
    const bubbleRefs = useRef<{ [key: number]: SVGGElement | null }>({});
    const navigate = useNavigate();
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const uniqueId = useId();

    const displayItems = useMemo(() => items.slice(0, maxItems), [items, maxItems]);
    const maxCount = useMemo(() => Math.max(...displayItems.map(i => i.listen_count), 1), [displayItems]);

    // Stable hash for dependency array
    const currentItemsHash = JSON.stringify(displayItems.map(i => i.id));

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !displayItems.length) return;

        // Cleanup previous instance
        if (sceneRef.current) {
            Matter.Runner.stop(sceneRef.current.runner);
            Matter.Render.stop(sceneRef.current.render); // if any
            Matter.World.clear(sceneRef.current.engine.world, false);
            Matter.Engine.clear(sceneRef.current.engine);
            cancelAnimationFrame(sceneRef.current.renderLoop);
            sceneRef.current = null;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width === 0 || height === 0) return;

        // --- Physics Setup ---
        const Engine = Matter.Engine,
            Runner = Matter.Runner,
            Bodies = Matter.Bodies,
            Composite = Matter.Composite,
            Mouse = Matter.Mouse,
            MouseConstraint = Matter.MouseConstraint,
            Events = Matter.Events,
            Query = Matter.Query;

        const engine = Engine.create();
        const world = engine.world;
        engine.gravity.y = 0; // Zero gravity
        engine.gravity.x = 0;

        const minSize = 40;
        const maxSize = 90;

        // Create Bodies
        const bodies = displayItems.map((item) => {
            const normalizedCount = item.listen_count / maxCount;
            const size = minSize + normalizedCount * (maxSize - minSize);
            const radius = size / 2;

            // Random initial position
            const x = width / 2 + (Math.random() - 0.5) * 100;
            const y = height / 2 + (Math.random() - 0.5) * 100;

            const body = Bodies.circle(x, y, radius, {
                restitution: 0.9,
                friction: 0.1,
                frictionAir: 0.05,
                density: 0.001,
                label: `artist-${item.id}`
            });
            (body as any).plugin = { item, radius };
            return body;
        });

        Composite.add(world, bodies);

        // Invisible Walls
        const wallThickness = 500;
        const walls = [
            Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true, render: { visible: false } })
        ];
        Composite.add(world, walls);

        // --- Interaction ---
        const mouse = Mouse.create(container);
        mouse.pixelRatio = window.devicePixelRatio || 1;

        mouse.element.removeEventListener("mousewheel", (mouse as any).mousewheel);
        mouse.element.removeEventListener("DOMMouseScroll", (mouse as any).mousewheel);

        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                damping: 0.1,
                render: { visible: false }
            }
        });
        Composite.add(world, mouseConstraint);

        // --- Logic Loop ---
        Events.on(engine, "beforeUpdate", () => {
            const cx = width / 2;
            const cy = height / 2;

            bodies.forEach(body => {
                // Gentle gravity towards center
                const dx = cx - body.position.x;
                const dy = cy - body.position.y;
                Matter.Body.applyForce(body, body.position, {
                    x: dx * 1e-6,
                    y: dy * 1e-6
                });
            });
        });

        // --- Click vs Drag Handling ---
        // Instead of boolean flag, we check distance moved
        let startPoint = { x: 0, y: 0 };

        Events.on(mouseConstraint, "mousedown", (event) => {
            startPoint = { x: event.mouse.absolute.x, y: event.mouse.absolute.y };
        });

        Events.on(mouseConstraint, "mouseup", (event) => {
            const endPoint = event.mouse.absolute;
            const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);

            // If moved less than 6 pixels, consider it a click
            if (distance < 6) {
                const clickedBodies = Query.point(bodies, endPoint);
                if (clickedBodies.length > 0) {
                    const item = (clickedBodies[0] as any).plugin?.item;
                    if (item) {
                        navigate(`/artist/${item.id}`);
                    }
                }
            }
        });

        const runner = Runner.create();
        Runner.run(runner, engine);

        // --- Render Loop ---
        const updateDOM = () => {
            if (!containerRef.current) return;

            const mPos = mouse.position;
            const hoveredBody = Query.point(bodies, mPos)[0];
            const foundId = hoveredBody ? (hoveredBody as any).plugin.item.id : null;
            setHoveredId(foundId);

            bodies.forEach(body => {
                const itemId = (body as any).plugin.item.id;
                const el = bubbleRefs.current[itemId];
                if (el) {
                    const { x, y } = body.position;
                    // Using translate3d for hardware acceleration sometimes helps mobile, though SVG usually just needs translate
                    el.setAttribute('transform', `translate(${x}, ${y})`);
                }
            });
            sceneRef.current.renderLoop = requestAnimationFrame(updateDOM);
        };
        sceneRef.current = { engine, runner, renderLoop: requestAnimationFrame(updateDOM) };

        return () => {
            if (sceneRef.current) {
                Matter.Runner.stop(sceneRef.current.runner);
                Matter.World.clear(sceneRef.current.engine.world, false);
                Matter.Engine.clear(sceneRef.current.engine);
                cancelAnimationFrame(sceneRef.current.renderLoop);
            }
        };

    }, [currentItemsHash, navigate]);

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
            className="relative w-full aspect-square max-h-[400px] bg-[var(--color-bg-secondary)]/30 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{
                pointerEvents: 'all',
                touchAction: 'none' // CRITICAL: Prevent browser scrolling while interacting
            }}
        >
            <div className="absolute inset-0 bg-gradient-radial from-[var(--color-primary)]/5 to-transparent pointer-events-none" />

            <svg className="w-full h-full pointer-events-none display-block">
                <defs>
                    {displayItems.map(item => {
                        const patternId = `img-pattern-${uniqueId}-${item.id}`;
                        return (
                            <pattern
                                key={patternId}
                                id={patternId}
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
                    const patternId = `img-pattern-${uniqueId}-${item.id}`;
                    const normalizedCount = item.listen_count / maxCount;
                    const size = 40 + normalizedCount * (90 - 40);
                    const radius = size / 2;

                    const isHovered = hoveredId === item.id;

                    return (
                        <g
                            key={item.id}
                            ref={(el) => { bubbleRefs.current[item.id] = el; }}
                        >
                            {/* Shadow / Glow */}
                            <circle
                                r={radius}
                                fill="black"
                                opacity="0.2"
                                style={{ filter: 'blur(4px)', transform: 'translateY(4px)' }}
                            />

                            {/* Main Bubble */}
                            <circle
                                r={radius}
                                fill={item.image ? `url(#${patternId})` : "var(--color-bg-tertiary)"}
                                stroke={isHovered ? "var(--color-primary)" : "var(--color-bg-secondary)"}
                                strokeWidth={isHovered ? "4" : "2"}
                                className="transition-all duration-200"
                            />

                            {/* Gloss */}
                            <circle
                                r={radius}
                                fill="url(#glossGradient)" // We could add a gradient def for gloss
                                stroke="white"
                                strokeWidth="1"
                                strokeOpacity="0.2"
                                fillOpacity="0"
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip Layer */}
            {hoveredId && displayItems.find(b => b.id === hoveredId) && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-bg-secondary)]/95 backdrop-blur-md border border-[var(--color-fg-tertiary)]/20 rounded-full px-5 py-2 shadow-2xl z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-[var(--color-fg)] whitespace-nowrap">
                            {displayItems.find(b => b.id === hoveredId)?.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-primary)] font-bold mt-0.5">
                            {displayItems.find(b => b.id === hoveredId)?.listen_count.toLocaleString()} plays
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ArtistBubbles;

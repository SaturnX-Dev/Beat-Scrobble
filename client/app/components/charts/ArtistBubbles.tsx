import { useEffect, useRef, useState, useMemo, memo } from "react";
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
    const [isReady, setIsReady] = useState(false);

    const displayItems = useMemo(() => items.slice(0, maxItems), [items, maxItems]);
    const maxCount = useMemo(() => Math.max(...displayItems.map(i => i.listen_count), 1), [displayItems]);

    // Stable hash for dependency array
    const currentItemsHash = JSON.stringify(displayItems.map(i => i.id));

    // Store dimensions in ref to avoid reading DOM in physics loop (causes 0,0 bug)
    const dimensionsRef = useRef({ width: 0, height: 0 });

    // Monitor resize to determine readiness and keep dimensions updated
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            const { width, height } = entry.contentRect;

            if (width > 0 && height > 0) {
                dimensionsRef.current = { width, height };
                setIsReady(true);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        // Only run if we have data AND the container has valid size
        if (!containerRef.current || !displayItems.length || !isReady) return;

        // Cleanup previous instance if it exists (safety check)
        if (sceneRef.current) {
            Matter.Runner.stop(sceneRef.current.runner);
            Matter.Engine.clear(sceneRef.current.engine);
            Matter.Composite.clear(sceneRef.current.engine.world, false, true);
            if (sceneRef.current.renderLoop) {
                cancelAnimationFrame(sceneRef.current.renderLoop);
            }
        }

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
        engine.gravity.y = 0;
        engine.gravity.x = 0;

        // Min/Max size for bubbles
        const minSize = 40;
        const maxSize = 90;

        // Use valid dimensions for initial spawn
        const initialWidth = dimensionsRef.current.width || 300;
        const initialHeight = dimensionsRef.current.height || 300;

        // Create Physics Bodies
        const bodies = displayItems.map((item) => {
            const normalizedCount = item.listen_count / maxCount;
            const size = minSize + normalizedCount * (maxSize - minSize);
            const radius = size / 2;

            // Random initial position near center but spread out
            const x = initialWidth / 2 + (Math.random() - 0.5) * 50;
            const y = initialHeight / 2 + (Math.random() - 0.5) * 50;

            const body = Bodies.circle(x, y, radius, {
                restitution: 0.9,
                friction: 0.005,
                frictionAir: 0.02,
                density: 0.04,
                label: `artist-${item.id}`
            });
            (body as any).plugin = { item, radius };
            return body;
        });

        Composite.add(world, bodies);

        // --- Walls ---
        let walls: Matter.Body[] = [];
        const updateWalls = () => {
            // Use cached dimensions to avoid 0-width collapse
            const width = dimensionsRef.current.width;
            const height = dimensionsRef.current.height;

            if (width <= 0 || height <= 0) return;

            Composite.remove(world, walls);
            const wallThickness = 100;
            walls = [
                Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, { isStatic: true, render: { visible: false } }),
                Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, { isStatic: true, render: { visible: false } }),
                Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true, render: { visible: false } }),
                Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true, render: { visible: false } })
            ];
            Composite.add(world, walls);
        };
        updateWalls();

        // Secondary observer for this specific instance to update walls on resize
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                dimensionsRef.current = { width, height };
                updateWalls();
                // Wake up bodies on resize
                bodies.forEach(b => Matter.Sleeping.set(b, false));
            }
        });
        resizeObserver.observe(containerRef.current);

        // --- Mouse Interaction ---
        const mouse = Mouse.create(containerRef.current);
        // Important: prevent Matter from capturing scroll events or interfering with other interactions
        mouse.element.removeEventListener("mousewheel", (mouse as any).mousewheel);
        mouse.element.removeEventListener("DOMMouseScroll", (mouse as any).mousewheel);

        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.1,
                render: { visible: false }
            }
        });
        Composite.add(world, mouseConstraint);

        // Click Logic
        let isDragging = false;
        Events.on(mouseConstraint, "startdrag", () => { isDragging = true; });
        Events.on(mouseConstraint, "enddrag", () => {
            // Small delay to ensure mouseup doesn't trigger click immediately after drag
            setTimeout(() => { isDragging = false; }, 100);
        });

        Events.on(mouseConstraint, "mouseup", (event) => {
            if (!isDragging) {
                // Check if we actually clicked a body
                const clickedBodies = Query.point(bodies, event.mouse.position);
                if (clickedBodies.length > 0) {
                    const item = (clickedBodies[0] as any).plugin?.item;
                    if (item) {
                        navigate(`/artist/${item.id}`);
                    }
                }
            }
        });

        // Loop for Hover & Ambient Motion
        Events.on(engine, "beforeUpdate", () => {
            const hoveredBody = Query.point(bodies, mouse.position)[0];
            setHoveredId(hoveredBody ? (hoveredBody as any).plugin.item.id : null);

            // Use cached dimensions for center point
            const cx = dimensionsRef.current.width / 2;
            const cy = dimensionsRef.current.height / 2;

            if (cx === 0 || cy === 0) return; // Skip force if dimensions invalid

            // Gentle ambient motion to keep them alive
            bodies.forEach(body => {
                // Push them towards center if they drift too far
                const dist = Math.sqrt(Math.pow(body.position.x - cx, 2) + Math.pow(body.position.y - cy, 2));

                // Very subtle attraction to center
                Matter.Body.applyForce(body, body.position, {
                    x: (cx - body.position.x) * 1e-6,
                    y: (cy - body.position.y) * 1e-6
                });
            });
        });

        const runner = Runner.create();
        Runner.run(runner, engine);

        // Sync DOM with Physics
        const updateDOM = () => {
            // Only update if component is still mounted/valid
            if (!sceneRef.current) return;

            bodies.forEach(body => {
                const itemId = (body as any).plugin.item.id;
                const el = bubbleRefs.current[itemId];
                if (el) {
                    const { x, y } = body.position;
                    // Provide a translation but ensure it's valid
                    if (!isNaN(x) && !isNaN(y)) {
                        el.setAttribute('transform', `translate(${x}, ${y})`);
                    }
                }
            });
            sceneRef.current.renderLoop = requestAnimationFrame(updateDOM);
        };
        updateDOM();

        sceneRef.current = { engine, runner, renderLoop: 0 }; // store loop id later

        return () => {
            resizeObserver.disconnect();
            if (sceneRef.current) {
                Matter.Runner.stop(sceneRef.current.runner);
                Matter.Engine.clear(sceneRef.current.engine);
                Matter.Composite.clear(sceneRef.current.engine.world, false, true);
                if (sceneRef.current.renderLoop) {
                    cancelAnimationFrame(sceneRef.current.renderLoop);
                }
            }
            sceneRef.current = null;
        };
    }, [currentItemsHash, navigate, isReady]);

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
            className="relative w-full aspect-square max-h-[400px] bg-[var(--color-bg-secondary)]/30 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        >
            <div className="absolute inset-0 bg-gradient-radial from-[var(--color-primary)]/5 to-transparent pointer-events-none" />

            <svg className="w-full h-full select-none" style={{ pointerEvents: 'none' }}>
                <defs>
                    {displayItems.map(item => {
                        const maxC = Math.max(...displayItems.map(i => i.listen_count), 1);
                        const minS = 40, maxS = 90;
                        const norm = item.listen_count / maxC;
                        const size = minS + norm * (maxS - minS);

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
                    const size = 40 + normalizedCount * (90 - 40);
                    const radius = size / 2;

                    return (
                        <g
                            key={item.id}
                            ref={(el) => { bubbleRefs.current[item.id] = el; }}
                        >
                            <circle
                                r={radius}
                                fill="black"
                                opacity="0.2"
                                style={{ filter: 'blur(3px)', transform: 'translateY(2px)' }}
                            />
                            <circle
                                r={radius}
                                fill={item.image ? `url(#img-pattern-${item.id})` : "var(--color-bg-tertiary)"}
                                stroke="var(--color-bg-secondary)"
                                strokeWidth="2"
                                className="transition-all duration-300"
                                style={{
                                    filter: hoveredId === item.id ? 'brightness(1.1)' : 'none'
                                }}
                            />
                            <circle
                                r={radius}
                                fill="none"
                                stroke="white"
                                strokeWidth="1"
                                opacity="0.15"
                            />
                        </g>
                    );
                })}
            </svg>

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
});

export default ArtistBubbles;

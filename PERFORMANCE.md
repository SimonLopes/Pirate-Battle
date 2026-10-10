# Performance

## How I measured

I used the production build on Vercel, opened with `?perf=1`. While the match is running the game records every frame time and the entity count (player, enemies and cannonballs), and shows a summary on the result screen. The target is 60 fps.

Every run used a 180 s match with a spawn every 2 s, the hardest setting allowed, so enemies keep piling up.

## Desktop

Ryzen 5 2600, Radeon RX 570 4GB, Windows 10 22H2, Chrome 154, monitor at 180 Hz.

Over 180 s I got 32382 frames, 179.9 fps on average, a p95 frame time of 5.6 ms and a peak of 88 entities. The frame rate is capped by the monitor refresh rate, not by the game.

## Mobile

iPhone 15 Pro, Safari.

With Low Power Mode on it held a steady 29.98 fps, with a p95 of 41 ms and a peak of 97 entities. Low Power Mode caps Safari at 30 fps, so that's the cap and not the game. With it off, the same match ran 180.04 s with 10758 frames, 59.75 fps on average, a p95 of 18 ms and a peak of 94 entities.

## Memory

On my PC, a DevTools heap snapshot showed 17.6 MB on the menu and 21.8 MB after 5 matches.

I also did a headless run on the production build: 10 matches of starting, about 12 s of moving and firing, and going back to the menu, forcing GC before every reading. The heap was 3.97 MB at the start, 7.56 MB after the first match, 8.74 MB after 5 and 9.44 MB after 10. The first match loads Pixi, the textures and the sounds once. After that it grows a little each match and keeps slowing down. Comparing heap snapshots, most of that growth is V8 compiled code. Texture and audio buffer counts stay the same, and there are no canvases left on the menu after any match, so I don't see a leak.

## What keeps it cheap

The simulation runs on a fixed timestep and never runs more than 5 steps in a frame. Cannonball sprites, enemy ship sprites and effects (flashes, explosions, trails, splashes, wrecks) are created once in pools and reused, so nothing is allocated per shot. Textures are loaded once and shared between matches. The HUD store only notifies React when a value changes, so React doesn't render every frame.

## Limitations

The desktop result is capped by the monitor's refresh rate, so it doesn't show how much headroom there is. I didn't test on a low end Android phone.

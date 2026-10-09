# Difficulty

A match lasts 120 seconds. The player has 100 HP and the fastest hull, 180 px/s. Each ball deals 10, so it takes 10 hits to die. The front cannon reloads in 0.45 s. The side cannons reload in 1.2 s and fire three balls.

The chaser has 30 HP and dies in three shots. It moves at 150 and turns at 2.4 rad/s, a bit tighter than the player. If it rams the player, it deals 25 and disappears. It gives no points. Four rams end the match.

The shooter has 40 HP, four shots. It is the slowest, 110 px/s, and stops to fire within 360. Its cooldown is 1.5 s. Enemies spawn at least 520 away from the player, so a shooter never spawns already in range.

There are no fixed enemy spawn points. Each spawn picks random positions with the match RNG, so the same seed gives the same spawns. A position is used only if the hull is in open water at least 24 px from every island collider, at least 48 px from the arena edges, at least 520 from the player and not on top of another enemy. I try up to 30 positions. If none fits, that spawn tick is skipped and the next one comes after the normal interval. The map only keeps the player spawn.

The match starts with one of each. After that a ship comes in every 3 seconds, half chasers and half shooters. The interval set in Options is used as is for the whole match, there is no ramp. Enemies do not get stronger and the interval stays the same, so the pressure comes from the enemies you leave alive piling up.

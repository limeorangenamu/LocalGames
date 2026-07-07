# Academy Hero Arena

Local/LAN multiplayer first-person 3D hero shooter prototype.

The project uses Node.js, Express, Socket.IO, and Three.js. It is an original practice prototype inspired by small arena deathmatch shooters: first-person camera, WASD movement, Space jump, Shift sprint, mouse aiming, hitscan-like projectile combat, respawns, and a compact manor courtyard map.

## Features

- First-person 3D WebGL view with Three.js
- Local/LAN multiplayer via Socket.IO
- WASD movement relative to camera direction
- Mouse look with pointer lock
- Space jump
- Shift sprint
- Left click attacks
- Right click tank barrier
- R assault reload
- Enter chat
- Q hero skill gauge
- Server-authoritative player movement, gravity, bullets, damage, kills, deaths, and respawns
- Courtyard/manor deathmatch map with walls, cover, towers, fountain, and split lanes

## Heroes

- Assault: 100 HP hitscan rifle fighter. The rifle has 20 rounds, reloads automatically when empty, and can be reloaded with R. A full Q gauge equips a 4-shot rocket launcher.
- Tank: 200 HP two-handed hammer fighter. Hold right click to raise a 1000 HP barrier. Left click sweeps the hammer left and right for 50 damage. A full Q gauge stuns enemies in a forward cone for 1.5 seconds.
- Support: 15-shot fast shuriken skirmisher. Reload works like Assault. A full Q gauge heals self and briefly increases attack speed.

## Run

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

For LAN play, other players should open the server PC's local IP address, for example:

```text
http://192.168.0.23:3000
```

## Controls

- Move: WASD
- Look: mouse
- Attack: left click
- Tank barrier: hold right click
- Assault reload: R
- Chat: Enter
- Jump: Space
- Sprint: Shift
- Skill: Q when the gauge reaches 100
- Hero select: Esc

## Main Files

- `server.js`: multiplayer state, 3D movement, jumping, sprinting, bullet collision, map collision
- `public/client.js`: Three.js rendering, first-person camera, input, HUD
- `public/style.css`: menu and HUD styling
- `public/index.html`: game shell

## Note

This is not a recreation of any commercial map, hero, art, sound, or game asset. The map is an original simple manor-courtyard arena made for learning and prototyping.

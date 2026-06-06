// modules/controls.js — Unit 10: Flight controls & physics (STUB — implement me).
//
// Mouse/WASD steer (pitch/yaw/roll), Shift=accel, Ctrl=descend, gravity/lift. Writes ctx.player.group transform + ctx.state.speed/alt/heading/distanceKm. Only active while ctx.state.phase===playing.
//
// Contract (see ../ctx.js): export default { id, init(ctx), update(dt, ctx), dispose?() }.
// Talk ONLY through ctx. Do NOT import other modules. Do NOT edit main.js / ctx.js / index.html.
// Keep the page booting green: never throw on init; guard against missing siblings.
export default {
  id: 'controls',
  init(ctx) {
    // TODO(controls): build/initialize. Mouse/WASD steer (pitch/yaw/roll), Shift=accel, Ctrl=descend, gravity/lift. Writes ctx.player.group transform + ctx.state.speed/alt/heading/distanceKm. Only active while ctx.state.phase===playing.
  },
  update(dt, ctx) {
    // TODO(controls): per-frame update (dt seconds).
  },
};

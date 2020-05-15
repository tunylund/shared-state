import { loop, draw, buildControls } from '../node_modules/tiny-game-engine/lib/index.mjs';
import { connect, send, on, ACTIONS, state } from '../node_modules/shared-state-client/dist/index.mjs';
connect('http://localhost:3000', { lagInterval: 500, debugLog: false, fastButUnreliable: true });
let myId;
on(ACTIONS.INIT, (id) => myId = id);
let updates = 0, updateFps = 0;
on(ACTIONS.STATE_UPDATE, () => updates++);
setInterval(() => { updateFps = updates; updates = 0; }, 1000);
loop((step, duration) => {
    const current = state();
    draw((ctx, cw, ch) => {
        var _a, _b;
        const hue = (_b = (_a = current.cubes) === null || _a === void 0 ? void 0 : _a.find(({ id }) => id === myId)) === null || _b === void 0 ? void 0 : _b.hue;
        ctx.fillStyle = `hsla(${hue}, 50%, 75%, 1)`;
        ctx.fillRect(-cw, -ch, cw * 2, ch * 2);
    });
    draw((ctx) => {
        var _a;
        (_a = current.cubes) === null || _a === void 0 ? void 0 : _a.map((cube) => {
            ctx.fillStyle = `hsla(${cube.hue}, 50%, 50%, 1)`;
            ctx.strokeStyle = `hsla(${cube.hue}, 80%, 30%, 1)`;
            ctx.strokeRect(cube.pos.cor.x, cube.pos.cor.y, cube.dim.x, cube.dim.y);
            ctx.fillRect(cube.pos.cor.x, cube.pos.cor.y, cube.dim.x, cube.dim.y);
        });
    });
    draw((ctx, cw, ch) => {
        var _a;
        if ((_a = current.lagStatistics) === null || _a === void 0 ? void 0 : _a.hasOwnProperty(myId)) {
            const lag = current.lagStatistics[myId];
            const text = `lag: ${lag}ms   updates: ${updateFps}/s`;
            ctx.font = '12px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(text, cw - 20 - ctx.measureText(text).width, -ch + 20);
        }
    });
});
const controls = buildControls(window, ({ dir }) => send('input', dir));
loop((step, gameDuration) => {
    const current = state();
    // current.cubes?.map(cube => {
    //   cube.pos = move(cube.pos, step)
    // })
    // send('input', controls.dir)
});

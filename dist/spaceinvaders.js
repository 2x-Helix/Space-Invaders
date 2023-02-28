"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
///////////////////////////////////////////////////////////////////////////////////
//  Local Storage functions to access high score.
// 
const 
// Pure functions
// Checks if browser have local storage
isLocalStorage = (local) => typeof (local) !== undefined, 
// Gets value with key at location in input storage
getDataLocalStorage = (local, key) => isLocalStorage(local) ? Number(local.getItem(key)) : 0, 
// Impure functions
// Sets value at input key in local storage
updateLocalStorage = (local, key, hiScore) => isLocalStorage(local) ? local.setItem(key, String(hiScore)) : null;
///////////////////////////////////////////////////////////////////////////////////
//  Space in qvaders controller
//     
function spaceinvaders() {
    ///////////////////////////////////////////////////////////////////////////////////
    //  Game constants, types, and classes. 
    //
    const CONST = {
        CANVAS_SIZE: 600,
        START_TIME: 0,
        SHIP: {
            DIMS: { width: 50, height: 20 },
        },
        BULLET: {
            PLAYER_VEL: 5,
            ALIEN_VEL: 5,
            DIMS: { width: 6, height: 24 },
        },
        BULLET_HOLE: {
            DIMS: { width: 25, height: 25 },
        },
        SHIELD: {
            INITIAL_POS: new Vec(10, 425),
            DISTANCE_APART: 125,
            DIMS: {
                width: 80,
                height: 40,
            },
        },
        ALIEN: {
            SPACING: 10,
            SCORING: 10,
            SPRITE: "../sprites/invader.svg",
            DIMS: { width: 35, height: 35 },
            INITIAL: {
                POS: new Vec(50, 50),
                SPEED: 0.3,
                ACC: 0.0001,
            },
            X_BOUNDS: { left: 50, right: 500 },
            MOVE_DIST: { x: 140, y: 35 },
            ROWS: 3,
            COLS: 8,
            SHOOT_CHANCE: 0.02,
        },
        UFO: {
            INITIAL: {
                POS: new Vec(-50, 50),
                VEL: new Vec(2, 0),
            },
            DIMS: {
                width: 100,
                height: 60,
            },
            SPRITE: "../sprites/mysteryShip.svg",
            POINTS: 50,
            SPAWN_CHANCE: 0.0005,
        },
        HIGH_SCORE_KEY: "SPACE_INVADERS_HI_SCORE",
        PREV_HI_SCORE: getDataLocalStorage(localStorage, "SPACE_INVADERS_HI_SCORE"),
        RNG_SEEDS: {
            CHANCE: Math.random(),
            SHOOTER: Math.random(),
            MYSTERY_SHIP: Math.random(),
        },
        DIFFICULTY: {
            ALIEN_ACC_SCALE: 2,
        },
    };
    // Game state transitions
    class Tick {
        constructor(elapsed) {
            this.elapsed = elapsed;
        }
    }
    class Move {
        constructor(direction) {
            this.direction = direction;
        }
    }
    class Shoot {
        constructor() { }
    }
    class AlienShoot {
        constructor() { }
    }
    class Restart {
        constructor() { }
    }
    class UfoSpawn {
        constructor() { }
    }
    ///////////////////////////////////////////////////////////////////////////////////
    //  User input observer streams.
    //  Aquired and based upon code in FPR Asteroids (Dwyer, n.d.)
    //
    const 
    // Watch and read keys for input
    keyObservable = (e, k, result) => (0, rxjs_1.fromEvent)(document, e)
        .pipe((0, operators_1.filter)(({ code }) => code === k), (0, operators_1.filter)(({ repeat }) => !repeat), (0, operators_1.map)(result)), 
    // Game tick every 10ms
    gameClock$ = (0, rxjs_1.interval)(10)
        .pipe((0, operators_1.map)(elapsed => new Tick(elapsed))), 
    // Key observables
    startLeftMove$ = keyObservable('keydown', 'ArrowLeft', () => new Move(-3)), startRightMove$ = keyObservable('keydown', 'ArrowRight', () => new Move(3)), stopLeftMove$ = keyObservable('keyup', 'ArrowLeft', () => new Move(0)), stopRightMove$ = keyObservable('keyup', 'ArrowRight', () => new Move(0)), shoot$ = keyObservable('keydown', 'Space', () => new Shoot()), restart$ = keyObservable('keydown', 'KeyR', () => new Restart()), 
    // Stream generating numbers between [0, 1] using a pseudo-random method
    // Code from/based upon PiApproximationFRP (Dwyer, 2021)
    randomNumber$ = (seed) => (0, rxjs_1.interval)(50).pipe((0, operators_1.scan)((r, _) => r.next(), new RNG(seed)), (0, operators_1.map)(r => r.float()));
    // Randomized streams for alien shoot chance & ufo     
    const alienShootChance$ = randomNumber$(CONST.RNG_SEEDS.CHANCE).pipe((0, operators_1.filter)(n => n <= CONST.ALIEN.SHOOT_CHANCE), (0, operators_1.map)(() => new AlienShoot())), ufoSpawnChance$ = randomNumber$(CONST.RNG_SEEDS.MYSTERY_SHIP).pipe((0, operators_1.filter)(n => n <= CONST.UFO.SPAWN_CHANCE), (0, operators_1.map)(() => new UfoSpawn()));
    ///////////////////////////////////////////////////////////////////////////////////
    //  Generators for in game objects.
    //  Body attributes based upon FPR Asteroids (Dwyer, n.d.)
    const 
    // Generic body generator
    createBody = ((viewType) => (oId) => (time) => (dims) => (pos) => (vel) => (acc) => ({
        id: viewType + (isNotNullOrUndefined(oId) ? oId : ""),
        viewType: viewType,
        createTime: time,
        dims: dims,
        pos: pos,
        vel: vel,
        acc: acc,
    })), 
    // Alien generator 
    createAlien = ((oId) => (pos) => (accMag) => createBody('alien')(oId)(CONST.START_TIME)(CONST.ALIEN.DIMS)(pos)(new Vec(CONST.ALIEN.INITIAL.SPEED, 0))(new Vec(accMag, 0))); // Always move left first
    // Initialises the player's ship
    function createShip() {
        const SHIP_DIMS = CONST.SHIP.DIMS;
        return (createBody('ship')(null) // no identifier as html id is ship
        (CONST.START_TIME)(SHIP_DIMS)(new Vec(CONST.CANVAS_SIZE / 2 - SHIP_DIMS.width / 2, CONST.CANVAS_SIZE - 50 - SHIP_DIMS.height / 2))(Vec.Zero)(Vec.Zero));
    }
    // Initialises the player's shields
    function createShields() {
        return (Array(5).fill(null).map((_, i) => createBody('shield')(i)(CONST.START_TIME)(CONST.SHIELD.DIMS)(CONST.SHIELD.INITIAL_POS // Shift shields by set distance
            .add(new Vec(i * CONST.SHIELD.DISTANCE_APART, 0)))(Vec.Zero)(Vec.Zero)));
    }
    // Initialises aliens and their info 
    function createAliens(alienAcc) {
        // Shortened constants for easy referal
        const ALIEN = CONST.ALIEN, ROWS = ALIEN.ROWS, COLS = ALIEN.COLS, TOTAL = ROWS * COLS;
        // Generate all aliens at their respective positions
        const aliens = Array(TOTAL)
            .fill(null)
            .map((_, i) => createAlien(i)(ALIEN.INITIAL.POS.add(new Vec(i % COLS * (ALIEN.DIMS.width + ALIEN.SPACING), Math.floor(i / COLS) * (ALIEN.DIMS.height + ALIEN.SPACING))))(alienAcc));
        return {
            bodies: aliens,
            accMagnitude: alienAcc,
            movementPos: {
                start: new Vec(CONST.ALIEN.INITIAL.POS.x, 0),
                current: createAlien(null)(new Vec(CONST.ALIEN.INITIAL.POS.x, 0))(CONST.ALIEN.INITIAL.ACC),
            },
        };
    }
    ///////////////////////////////////////////////////////////////////////////////////
    //  Game State objects and methods.
    //  
    const 
    // Initiial state of game
    initialState = {
        time: CONST.START_TIME,
        score: 0,
        hiScore: CONST.PREV_HI_SCORE,
        gameOver: false,
        ship: createShip(),
        bullets: [],
        exit: [],
        shields: createShields(),
        holes: [],
        aliens: createAliens(CONST.ALIEN.INITIAL.ACC),
        ufo: [],
        objCount: CONST.ALIEN.ROWS * CONST.ALIEN.COLS,
        rng: new RNG(CONST.RNG_SEEDS.SHOOTER),
    }, 
    // renews state to a beginning state for restart or new level
    renewState = (s, resetState) => {
        const alienAcc = resetState ? CONST.ALIEN.INITIAL.ACC : CONST.DIFFICULTY.ALIEN_ACC_SCALE * s.aliens.accMagnitude;
        return {
            ...s,
            ship: createShip(),
            time: CONST.START_TIME,
            score: resetState ? 0 : s.score,
            gameOver: false,
            bullets: [],
            exit: [].concat(s.bullets, s.holes, s.ufo, s.aliens),
            holes: [],
            aliens: createAliens(alienAcc),
            ufo: [],
            objCount: s.objCount + CONST.ALIEN.ROWS * CONST.ALIEN.COLS,
            rng: s.rng.next(),
        };
    };
    ///////////////////////////////////////////////////////////////////////////////////
    //  Physics handlers for Body objects.
    //  Structure of functions: handleCollisions, tick, reducedState based off FPR Asteroids (Dwyer, n.d.)
    const 
    // Comparison of ids between bodies
    sameId = (a) => (b) => a.id === b.id, 
    // Compare specified viewtype with body
    isViewType = (v) => (o) => v === o.viewType, 
    // Check if objects are in the bounds of the canvas
    inBounds = (o) => {
        const s = CONST.CANVAS_SIZE, topLeft = o.pos, { width, height } = o.dims, bound = (v) => (v > 0 && v < s);
        // Check if object leaves the top or bottom of the screen
        return (bound(topLeft.x) && bound(topLeft.x + width) && bound(topLeft.y) && bound(topLeft.y + height));
    }, 
    // Move objects accounting for velocity & acceleration
    moveBody = (o) => ({
        ...o,
        pos: o.pos.add(o.vel),
        vel: o.vel.add(o.acc),
    }), 
    // Stop object from moving and rebound back in canvas
    stopBody = (o) => ({
        ...o,
        pos: o.pos.sub(o.vel),
        vel: Vec.Zero,
    }), 
    // Handles movement of all aliens and shifts them down when required
    moveAliens = (a) => {
        // Shifts alien down and flips the direction of its movement
        const shiftAlienDown = (a) => ({
            ...a,
            pos: a.pos.add(new Vec(0, CONST.ALIEN.MOVE_DIST.y)),
            vel: a.vel.rotate(180),
            acc: a.acc.rotate(180),
        }), 
        // Max x pos controller of alien group may move to   
        aliensTopRightPosX = CONST.ALIEN.X_BOUNDS.right - (CONST.ALIEN.COLS * CONST.ALIEN.DIMS.width + (CONST.ALIEN.COLS - 1) * CONST.ALIEN.SPACING), 
        // Check group of aliens are in set bounds (prevent moving horizontally offscreen during acceleration)
        leftBound = (a.movementPos.current.pos.x <= a.movementPos.start.x - aliensTopRightPosX), rightBound = (a.movementPos.current.pos.x >= a.movementPos.start.x + aliensTopRightPosX), outOfBounds = leftBound || rightBound, 
        // Calculate shift amount to move aliens back in bounds
        shiftLeft = rightBound ? ((a.movementPos.current.pos.x + aliensTopRightPosX * 2) - CONST.ALIEN.X_BOUNDS.right) : 0, shiftRight = leftBound ? (a.movementPos.current.pos.x - CONST.ALIEN.X_BOUNDS.left) : 0, shiftAlienX = (a) => ({ ...a, pos: a.pos.add(new Vec(shiftLeft + shiftRight, 0)) });
        return {
            ...a,
            bodies: outOfBounds ? a.bodies.map(shiftAlienX).map(shiftAlienDown) : a.bodies.map(moveBody),
            movementPos: outOfBounds
                ? { start: a.movementPos.current.pos, current: shiftAlienDown(shiftAlienX(a.movementPos.current)) }
                : { ...a.movementPos, current: moveBody(a.movementPos.current) }
        };
    }, 
    // Collision handler
    handleCollisions = (s) => {
        const 
        /** Checks collision between two rectangular bodies
         *  Check if distance between centres of bodies a and b
         *  is less than the sum of their radii.
         */
        bodiesCollided = ([a, b]) => {
            return (a.pos.x + a.dims.width >= b.pos.x &&
                a.pos.x <= b.pos.x + b.dims.width &&
                a.pos.y + a.dims.height >= b.pos.y &&
                a.pos.y <= b.pos.y + b.dims.height);
        }, 
        /* Removes bodies in the second array from the first array based on id
         * Function aquired from https://tgdwyer.github.io/asteroids/ */
        cut = except(sameId), 
        // Checks collisions between two lists of bodies and return colided pairs
        collidedBodies = (f) => (aArr) => (bArr) => flatMap(aArr, (a) => bArr.map((b) => ([a, b])))
            .filter((pair) => f(pair)), 
        // General collision funct
        checkCollision = collidedBodies(bodiesCollided), 
        // Check collisions of game objects
        shipCollided = s.bullets.filter(b => bodiesCollided([s.ship, b])).length > 0, 
        // Handles collisions with bullets and shields 
        collidedBulletsFromShields = checkCollision(s.bullets)(s.shields).map(([b, _]) => b), collidedBulletsFromHoles = checkCollision(collidedBulletsFromShields)(s.holes).map(([b, _]) => b), expiredBulletsFromShields = cut(collidedBulletsFromShields)(collidedBulletsFromHoles), // Remove bullets in holes
        // Handle collisions between bullets and aliens, alien bullets cant hit other aliens
        playerBullets = s.bullets.filter(isViewType('bulletPlayer')), collidedPlayerBulletsAndAliens = checkCollision(playerBullets)(s.aliens.bodies), expiredBulletsFromAliens = collidedPlayerBulletsAndAliens.map(([b, _]) => b), expiredAliens = collidedPlayerBulletsAndAliens.map(([_, a]) => a), remainingAliens = s.aliens.bodies.filter(not(elem(sameId)(expiredAliens))), 
        // Collision between bullets, remove bullets colliding with itself
        expiredBulletsWithBullets = checkCollision(s.bullets)(s.bullets).filter(not(([a, b]) => sameId(a)(b))).map(([b, _]) => b), 
        // Ufo collides with player bullet
        collidedPlayerBulletsAndUfo = checkCollision(playerBullets)(s.ufo), expiredBulletsFromUfo = collidedPlayerBulletsAndUfo.map(([b, _]) => b), expiredUfos = collidedPlayerBulletsAndUfo.map(([_, u]) => u), remainingUfos = s.ufo.filter(not(elem(sameId)(expiredUfos))), 
        // Generate holes at tip of bullets that collides with shields
        holesBullets = expiredBulletsFromShields.map((b, i) => createBody('hole')(s.objCount + i)(s.time)(CONST.BULLET_HOLE.DIMS)(b.pos.add(new Vec(b.dims.width / 2 - CONST.BULLET_HOLE.DIMS.width / 2, // Centre x coord of hole with centre x of bullet
        Math.sign(b.vel.y) > 0 ? CONST.BULLET_HOLE.DIMS.height - CONST.BULLET_HOLE.DIMS.height / 2 : 0))) // Centre at tip of impact of bullet
        (Vec.Zero)(Vec.Zero)), 
        // Collate all expired bullets
        expiredBullets = expiredBulletsFromShields.concat(expiredBulletsFromAliens, expiredBulletsWithBullets, expiredBulletsFromUfo), 
        // obj count and new score
        currentHoleCount = holesBullets.length, newScore = s.score + CONST.ALIEN.SCORING * collidedPlayerBulletsAndAliens.length + CONST.UFO.POINTS * expiredUfos.length;
        return {
            ...s,
            score: newScore,
            hiScore: newScore > s.hiScore ? newScore : s.hiScore,
            bullets: cut(cut(cut(s.bullets)(expiredBulletsFromShields))(expiredBulletsFromAliens))(expiredBulletsWithBullets),
            exit: s.exit.concat(expiredAliens, expiredBullets, expiredUfos),
            holes: s.holes.concat(holesBullets),
            aliens: {
                ...s.aliens,
                bodies: remainingAliens,
            },
            ufo: remainingUfos,
            objCount: s.objCount + currentHoleCount,
            gameOver: s.gameOver || shipCollided, // Game over if was found to be game over during tick
        };
    }, 
    // Lazy call to update status of objects 
    tick = (s, elapsed) => {
        const 
        // Delete bullets outside of the canvas
        activeBullets = s.bullets.filter(inBounds), expiredBullets = s.bullets.filter(not(inBounds)), 
        // Game over if alien reaches the bottom
        alienInvaded = s.aliens.bodies.filter(not(inBounds)).length > 0, 
        // UFO onscreen
        exitLeft = (o) => o.pos.x < CONST.CANVAS_SIZE + o.dims.width, activeUfos = s.ufo.filter(exitLeft), expiredUfos = except(sameId)(s.ufo)(activeUfos);
        return handleCollisions({
            ...s,
            ship: inBounds(s.ship) ? moveBody(s.ship) : stopBody(s.ship),
            bullets: activeBullets.map(moveBody),
            exit: s.exit.concat(expiredBullets, expiredUfos),
            aliens: moveAliens(s.aliens),
            ufo: activeUfos.map(moveBody),
            time: elapsed,
            gameOver: alienInvaded,
        });
    }, 
    // State transducer 
    reduceState = (s, e) => s.aliens.bodies.length === 0 ?
        renewState(s, false)
        : e instanceof Restart ?
            renewState(s, true) // Set to reset state
            : s.gameOver ?
                { ...s }
                : e instanceof Move ?
                    { ...s, ship: { ...s.ship, vel: new Vec(e.direction, 0) } }
                    : e instanceof Shoot ?
                        // Player may only have 1 projectile on screen
                        !s.bullets.find(b => b.viewType === 'bulletPlayer') ?
                            { ...s,
                                bullets: s.bullets.concat(createBody('bulletPlayer')(s.objCount)(s.time)(CONST.BULLET.DIMS)(s.ship.pos.add(new Vec(s.ship.dims.width / 2 - CONST.BULLET.DIMS.width / 2, -30))) // Offset from ship to prevent collision
                                (new Vec(0, CONST.BULLET.PLAYER_VEL).rotate(180))(Vec.Zero)),
                                objCount: s.objCount + 1
                            }
                            // Return state if player bullet already exists
                            : { ...s }
                        : e instanceof AlienShoot ?
                            alienShoot(s)
                            : e instanceof UfoSpawn ?
                                { ...s,
                                    ufo: s.ufo.concat(createBody('ufo')(s.objCount)(s.time)(CONST.UFO.DIMS)(CONST.UFO.INITIAL.POS) // Offset from ship to prevent collision
                                    (CONST.UFO.INITIAL.VEL)(Vec.Zero)),
                                    objCount: s.objCount + 1
                                }
                                : tick(s, e.elapsed);
    ///////////////////////////////////////////////////////////////////////////////////
    //  Alien functions
    //  Pseudo-randomly selects an alien to shoot                        
    function alienShoot(s) {
        const 
        // Generate random attacker index
        attackerIndex = Math.floor(s.aliens.bodies.length * s.rng.float()), attacker = s.aliens.bodies[attackerIndex];
        return {
            ...s,
            bullets: s.bullets.concat(createBody('bulletAlien')(s.objCount)(s.time)(CONST.BULLET.DIMS)(attacker.pos.add(new Vec(attacker.dims.width / 2 - CONST.BULLET.DIMS.width / 2, attacker.dims.height)))(new Vec(0, CONST.BULLET.ALIEN_VEL))(Vec.Zero)),
            objCount: s.objCount + 1,
            rng: s.rng.next(),
        };
    }
    ///////////////////////////////////////////////////////////////////////////////////
    //  Main game stream.
    // 
    const subscription$ = (0, rxjs_1.merge)(gameClock$, restart$, startLeftMove$, startRightMove$, stopLeftMove$, stopRightMove$, shoot$, alienShootChance$, ufoSpawnChance$)
        .pipe((0, operators_1.scan)(reduceState, initialState))
        .subscribe(updateView);
    ///////////////////////////////////////////////////////////////////////////////////
    //  Impure function responsible for adding/updating items to the svg canvas.
    //  
    function updateView(s) {
        const svg = document.getElementById("canvas"), ship = document.getElementById("ship"), userScore = document.getElementById("userScore"), hiScore = document.getElementById("hiScore"), restart = document.getElementById("restart"), 
        // Try to update input object, else create new svg element
        updateBodyView = (o) => (create) => {
            const v = document.getElementById(o.id) || create(o);
            attr(v, { x: o.pos.x, y: o.pos.y });
        };
        // Create svg rectangle on canvas
        function createRectBodyView(o) {
            // Get group of viewtype to ensure new object is on the correct layer
            const g = document.getElementById(o.viewType);
            const r = document.createElementNS(svg.namespaceURI, 'rect');
            attr(r, {
                id: o.id,
                x: o.pos.x,
                y: o.pos.y,
                width: o.dims.width,
                height: o.dims.height,
            });
            r.classList.add(o.viewType);
            g.appendChild(r);
            return r;
        }
        // Create alien image on canvas
        function createAlienView(o) {
            const g = document.getElementById('alien');
            const a = document.createElementNS(svg.namespaceURI, 'image');
            attr(a, {
                id: o.id,
                x: o.pos.x,
                y: o.pos.y,
                width: o.dims.width,
                height: o.dims.height,
                href: CONST.ALIEN.SPRITE
            });
            a.classList.add(o.viewType);
            g.appendChild(a);
            return a;
        }
        // Create alien image on canvas
        function createUfoView(o) {
            const g = document.getElementById('ufo');
            const a = document.createElementNS(svg.namespaceURI, 'image');
            attr(a, {
                id: o.id,
                x: o.pos.x,
                y: o.pos.y,
                width: o.dims.width,
                height: o.dims.height,
                href: CONST.UFO.SPRITE
            });
            a.classList.add(o.viewType);
            g.appendChild(a);
            return a;
        }
        // Update the svg canvas with position of game objects
        attr(ship, {
            // SVG ship position is centred as it is a polygon
            transform: `translate(${s.ship.pos.x + s.ship.dims.width / 2},${s.ship.pos.y + s.ship.dims.height / 2})`
        });
        s.holes.forEach((h) => updateBodyView(h)(createRectBodyView));
        s.bullets.forEach((b) => updateBodyView(b)(createRectBodyView));
        s.aliens.bodies.forEach((a) => updateBodyView(a)(createAlienView));
        s.ufo.forEach((a) => updateBodyView(a)(createUfoView));
        // Remove items from canvas
        s.exit
            .map(o => [document.getElementById(o.viewType), document.getElementById(o.id)])
            .filter(([g, v]) => isNotNullOrUndefined(g) && isNotNullOrUndefined(v))
            .forEach(([g, v]) => {
            try {
                g.removeChild(v);
                console.log("Removed: " + v.id);
            }
            catch (e) {
                console.log("Already removed: " + v.id);
            }
        });
        // Update player score
        userScore.innerHTML = `Score: ${s.score}`;
        updateLocalStorage(localStorage, CONST.HIGH_SCORE_KEY, s.hiScore);
        hiScore.innerHTML = `Hi-Score: ${s.hiScore}`;
        // Display game over when game ends
        s.gameOver ? attr(restart, { class: "gameover" }) : attr(restart, { class: "gameover hidden" });
    }
}
///////////////////////////////////////////////////////////////////////////////////
//  Starts game on load
// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined') {
    window.onload = () => {
        spaceinvaders();
    };
}
///////////////////////////////////////////////////////////////////////////////////
//  Useful functions and classes
//  Functions from FRP asteroids (Dwyer, n.d.)
class Vec {
    /**
     * 2D Vector class
     * @param x   movement in the direction x
     * @param y   movement in the direction y
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.add = (b) => new Vec(this.x + b.x, this.y + b.y);
        this.sub = (b) => this.add(b.scale(-1));
        this.len = () => Math.sqrt(this.x * this.x + this.y * this.y);
        this.scale = (s) => new Vec(this.x * s, this.y * s);
        this.ortho = () => new Vec(this.y, -this.x);
        this.rotate = (deg) => (rad => ((cos, sin, { x, y }) => new Vec(x * cos - y * sin, x * sin + y * cos))(Math.cos(rad), Math.sin(rad), this))(Math.PI * deg / 180);
    }
}
Vec.unitVecInDirection = (deg) => new Vec(0, -1).rotate(deg);
Vec.Zero = new Vec();
/**
 * apply f to every element of a and return the result in a flat array
 * @param a   an array
 * @param f   a function that produces an array
 */
function flatMap(a, f) {
    return Array.prototype.concat(...a.map(f));
}
const 
/**
 * Composable not: invert boolean result of given function
 * @param f   A function returning a boolean
 * @param x   Value to input into function f
 */
not = (f) => (x) => !f(x), 
/**
 * Checks if element e is in array a.
 * @param eq  Comparison function to compare elements in a to e
 * @param a   Array to check values of
 * @param e   Value to compare against values in a
 */
elem = (eq) => (a) => (e) => a.findIndex(eq(e)) >= 0, 
/**
 * Filters array a for any elements in array b
 * @param  eq   Comparison function to compare elements in arrays a and b
 * @param  a    Array of elements to copy
 * @param  b    Array of elements to remove
 */
except = (eq) => (a) => (b) => a.filter(not(elem(eq)(b))), 
/**
 * Set numerous of attributes of an element e at once.
 * @param e   Element to edit.
 * @param o   Property bag of properties to edit.
 */
attr = (e, o) => { for (const k in o)
    e.setAttribute(k, String(o[k])); };
/**
 * Type guard for use in filters
 * @param input   something that might be null or undefined
 */
function isNotNullOrUndefined(input) {
    return input != null;
}
///////////////////////////////////////////////////////////////////////////////////
//  Pseudo random number generator for ga 
//  Class from PiApproximationFRP (Dwyer, 2021) 
class RNG {
    constructor(state) {
        this.state = state;
        // LCG using GCC's constants
        this.m = 0x80000000;
        this.a = 1103515245;
        this.c = 12345;
    }
    int() {
        return (this.a * this.state + this.c) % this.m;
    }
    float() {
        return this.int() / (this.m - 1);
    }
    next() {
        return new RNG(this.int());
    }
}
//# sourceMappingURL=spaceinvaders.js.map
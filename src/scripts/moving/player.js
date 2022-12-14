/** @type {HTMLCanvasElement} */

// Key Handler & Util
import KeyHandler from '../key-handler.js';
import { Util } from '../still/util.js';

// Constant Parameters
import { MAP, PLAYER, PROJECTILE, HEALTH_BAR } from '../game-params.js';

// Classes
import Particle from './particle.js';
import PlayerHealth from './player-health.js';

export default class Player extends Particle {
  constructor(idx, pos, angle, color, edgeController, projectileController) {
    // params: passed in
    super(pos[0], pos[1], PLAYER.RADIUS, 0);
    this.idx = idx;
    this.angle = angle;
    this.speed = 0;
    this.color = color;
    this.edgeController = edgeController;
    this.projectileController = projectileController;
    this.keyHandler = new KeyHandler();

    document.addEventListener('keydown', (e) => this.keyHandler.keyPressed(e));
    document.addEventListener('keyup', (e) => this.keyHandler.keyReleased(e));;

    // params: default
    this.alive = true;

    // params: set by constant
    this.blasters = true;
    this.health = new PlayerHealth(PLAYER.MAX_HEALTH, this.color, this.idx);
    this.max_speed = PLAYER.MAX_SPEED;
    this.acceleration = PLAYER.ACCELERATION;
    this.projectiles = PLAYER.PROJECTILES;
    this.nitrous = PLAYER.MAX_NOS;


  }

  update () {
    this.runKeys();
    let [velX, velY] = Util.scale(Util.directionFrom(this.angle), this.speed);
    [this.x, this.y] = Particle.inbound(this.x + velX, this.y + velY, this.radius, this.alive);
    this.updateLayer();
  }

  handleIntersect (x, y, edgeX, edgeY) {
    // if (edgeX) this.resetX(edgeX);
    // if (edgeY) this.resetY(edgeY);
    edgeX ? this.resetPos(edgeX, this.y) : this.resetPos(this.x, edgeY);
    this.reverseDir(x, y * -0.7);
  }

  runKeys() {
    let pressedKeys = (this.alive ? this.keyHandler.activeActions()[this.idx] : {});

    if (pressedKeys.left) this.angle = (this.angle + 1 / PLAYER.TURN_RADIUS) % 360;
    if (pressedKeys.right) this.angle = (this.angle - 1 / PLAYER.TURN_RADIUS) % 360;
    if (pressedKeys.blast) {
      // if statement prevents multiple fires on one key press
      if (this.blasters) {
        this.blasters = false;
        this.shoot();
      }
    } else {
      this.blasters = true;
    }

    if (pressedKeys.throttle) {
      this.speed = Math.min(this.max_speed, this.speed + PLAYER.ACCELERATION);
    } else if (this.speed > 0) {
      this.speed = Math.floor(this.speed * 49 / 50 * 10) / 10;
    }

    if (pressedKeys.brake) {
      this.speed = Math.max(-this.max_speed, this.speed - PLAYER.ACCELERATION * 1);
    } else if (this.speed < 0) {
      this.speed = Math.ceil(this.speed * 49 / 50 * 10) / 10;
    }
  }

  shoot() {
    if (this.alive && this.projectiles > 0) {
      this.projectiles--;
      this.projectileController.shoot(this.x, this.y, this.angle, this.layer, PROJECTILE.SPEED, PROJECTILE.DAMAGE);
    }
    console.log('this.projectiles', this.projectiles);
  }

  damage(points) {
    this.health.damage(points);
    if (this.health.health <= 0) {
      this.alive = false;
      this.x = MAP.DIM_X + 100;
      this.y = MAP.DIM_Y + 100;
    }
  }

  givePerk(type) {
    // console.log('type', type);
    if (type === 0) this.health.restore(20);
    // console.log('this.projectiles', this.projectiles);
    if (type === 1) this.projectiles = Math.min(20,this.projectiles+2);
  }



  drawLayer(ctx, layer) {
    if (this.layer === layer) {
      this.drawHealth(ctx);
      this.drawAmmo(ctx);
      if (this.alive) {
        this.drawPlayer(ctx);
        this.drawLine(ctx);
      }
    }
  }

  drawPlayer(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'white';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 30;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius,
      0, 2 * Math.PI, false);
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
  }

  drawLine(ctx) {
    let [dx, dy] = Util.scale(Util.directionFrom(this.angle), PLAYER.RADIUS);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = this.color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + dx, this.y + dy);
    ctx.stroke();
  }

  drawHealth(ctx) {
    // Draw Red Bar
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    // ctx.fillStyle = null;
    // ctx.fillStyle = '#000000';
    ctx.strokeRect(this.health.x, this.health.y, HEALTH_BAR.WIDTH, HEALTH_BAR.HEIGHT, 5);

    // Draw Player Color Bar
    let gap = 3;
    // let healthWidth = Math.floor((this.health.health / this.health.maxHealth) * HEALTH_BAR.WIDTH);
    let healthHeight = Math.floor((this.health.health / this.health.maxHealth) * HEALTH_BAR.HEIGHT);
    ctx.fillStyle = '#33ff33';
    ctx.fillRect(this.health.x + gap, HEALTH_BAR.HEIGHT - Math.max(0, healthHeight) + this.health.y + gap, HEALTH_BAR.WIDTH - gap * 2, healthHeight - gap * 2);

    // ctx.fillStyle = playerColor;
    // Draw 'Player #{playerIndex} Health'
    ctx.font = "bold 17pt arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.health.color;
    if (this.idx === 0) {
      // ctx.fillRect(this.health.x + (HEALTH_BAR.WIDTH / 2) + 12, this.health.y - 15, 10, 5);
      ctx.fillText(`Player ${this.idx + 1}`, this.health.x + (HEALTH_BAR.WIDTH / 2) + 18, this.health.y - 25);
    } else {
      ctx.fillText(`Player ${this.idx + 1}`, this.health.x + (HEALTH_BAR.WIDTH / 2) - 18, this.health.y - 25);

    }
  }

  drawAmmo(ctx) {
    let x;
    let y1 = MAP.BORDER_HEIGHT + HEALTH_BAR.HEIGHT - 10;
    let dy = 10;
    let gap;
    let rightAdj = 0;
    let i = 0;

    if (this.idx === 0) {
      x = (this.idx === 0 ? MAP.BORDER_WIDTH * 3 / 6 : MAP.DIM_X - MAP.BORDER_WIDTH * 3 / 6 - HEALTH_BAR.WIDTH);
      gap = 3;
    } else {
      x = (this.idx === 0 ? MAP.BORDER_WIDTH * 3 / 6 : MAP.DIM_X - MAP.BORDER_WIDTH * 3 / 6 - HEALTH_BAR.WIDTH);
      gap = 3;
    }

    let cap = Math.min(this.projectiles.length, 20);
    for (let i = 0; i < cap; i++) {
      ctx.beginPath();
      ctx.fillStyle = 'red';
      ctx.roundRect(x + gap - rightAdj, y1, 30 - gap, dy);
      ctx.fill();
      ctx.closePath();
      y1 -= 15;
    }

    // ctx.beginPath();
    // ctx.fillStyle = 'red';
    // if (this.idx === 0) {
    //   x = (this.idx === 0 ? MAP.BORDER_WIDTH * 3 / 6 : MAP.DIM_X - MAP.BORDER_WIDTH * 3 / 6 - HEALTH_BAR.WIDTH);
    //   gap = 3;
    //   ctx.roundRect(x+gap, MAP.BORDER_HEIGHT + HEALTH_BAR.HEIGHT - 10, 30 - gap, 10);
    // } else {
    //   x = (this.idx === 0 ? MAP.BORDER_WIDTH * 3 / 6 : MAP.DIM_X - MAP.BORDER_WIDTH * 3 / 6 - HEALTH_BAR.WIDTH);
    //   gap = 3;
    //   ctx.roundRect(x-10, MAP.BORDER_HEIGHT + HEALTH_BAR.HEIGHT - 10, 30 - gap, 10);
    // }
    // ctx.fill();
    // ctx.stroke();
  }

}

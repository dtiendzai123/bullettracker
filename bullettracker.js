class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  multiplyScalar(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
  length() { return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2); }
  normalize() {
    const len = this.length();
    return len > 0 ? this.multiplyScalar(1 / len) : new Vector3();
  }
  clone() { return new Vector3(this.x, this.y, this.z); }
}

class BulletTracker {
  constructor() {
    this.bulletSpeed = 1200; // tuỳ súng, đơn vị game units/sec
    this.multiSnapPoints = this.generateHeadSnapPoints();
  }

  generateHeadSnapPoints() {
    // Các điểm snap xung quanh bone_Head
    return [
      new Vector3(0, 0, 0),                   // center
      new Vector3(0.015, 0.015, 0),           // top-right
      new Vector3(-0.015, 0.015, 0),          // top-left
      new Vector3(0.015, -0.015, 0),          // bottom-right
      new Vector3(-0.015, -0.015, 0),         // bottom-left
      new Vector3(0.025, 0, 0),               // right ear
      new Vector3(-0.025, 0, 0),              // left ear
      new Vector3(0, 0.025, 0),               // top skull
      new Vector3(0, -0.025, 0),              // jaw
    ];
  }

  predictTargetPosition(headPos, velocity, distance) {
    const travelTime = distance / this.bulletSpeed;
    return headPos.add(velocity.multiplyScalar(travelTime));
  }

  findBestSnapPoint(headCenter, velocity, playerPos) {
    let bestPoint = null;
    let minDist = Infinity;

    for (const offset of this.multiSnapPoints) {
      const snapTarget = headCenter.add(offset);
      const predicted = this.predictTargetPosition(snapTarget, velocity, playerPos.subtract(snapTarget).length());
      const dist = predicted.subtract(playerPos).length();

      if (dist < minDist) {
        minDist = dist;
        bestPoint = predicted;
      }
    }

    return bestPoint;
  }

  update(playerPos, headCenter, headVelocity) {
    const snapTarget = this.findBestSnapPoint(headCenter, headVelocity, playerPos);
    this.setAimTo(snapTarget);
  }

  setAimTo(vec3) {
    console.log("🎯 Snap Aim to:", vec3.x.toFixed(6), vec3.y.toFixed(6), vec3.z.toFixed(6));
    // Nếu có API:
    // GameAPI.setAim(vec3.x, vec3.y, vec3.z);
  }
}

// ======= Demo sử dụng =======
const tracker = new BulletTracker();

const playerPos = new Vector3(0, 1.6, 0);
const headPos = new Vector3(20.5, 2.1, -5.4);
const velocity = new Vector3(0.4, 0.01, -0.2); // Enemy velocity

setInterval(() => {
  tracker.update(playerPos, headPos, velocity);
}, 16); // 60FPS

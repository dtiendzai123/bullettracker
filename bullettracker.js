// ======= Vector3 Tối Ưu (Sửa & Bổ Sung) =======
const GamePackages = {
  GamePackage1: "com.dts.freefireth",
  GamePackage2: "com.dts.freefiremax"
};

// ===
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  addInPlace(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  subtract(v) {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  subtractInPlace(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(s) {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  multiplyScalarInPlace(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  lengthSquared() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length() {
    return Math.sqrt(this.lengthSquared());
  }

  normalize() {
    const lenSq = this.lengthSquared();
    if (lenSq < 1e-9) return new Vector3();
    const invLen = 1 / Math.sqrt(lenSq);
    return new Vector3(this.x * invLen, this.y * invLen, this.z * invLen);
  }

  normalizeInPlace() {
    const lenSq = this.lengthSquared();
    if (lenSq < 1e-9) return this;
    const invLen = 1 / Math.sqrt(lenSq);
    return this.multiplyScalarInPlace(invLen);
  }

  copyFrom(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  distanceSquaredTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  static zero() {
    return new Vector3(0, 0, 0);
  }

  static temp1 = new Vector3();
  static temp2 = new Vector3();
  static temp3 = new Vector3();
}

// ======= Sửa Lỗi & Tối Ưu Bullet Tracker =======
class AdvancedBulletTracker {
  constructor(options = {}) {
    this.bulletSpeed = options.bulletSpeed || 1200;
    this.gravity = options.gravity || 9.8;
    this.windResistance = options.windResistance || 0.02;
    this.maxPredictionTime = options.maxPredictionTime || 2.0;

    this.snapPoints = this.generateOptimizedSnapPoints();
    this.lastUpdateTime = 0;
    this.updateInterval = 16;
    this.velocityBuffer = [];
    this.maxVelocityHistory = 5;

    this.tempVec1 = new Vector3();
    this.lastBestPoint = new Vector3();
    this.aimStabilityThreshold = 0.001;
  }

  generateOptimizedSnapPoints() {
    const points = [
      { offset: new Vector3(0, 0, 0), priority: 1.0, name: "center" },
      { offset: new Vector3(0.012, 0.018, 0), priority: 0.9, name: "forehead_right" },
      { offset: new Vector3(-0.012, 0.018, 0), priority: 0.9, name: "forehead_left" },
      { offset: new Vector3(0.02, 0.005, 0), priority: 0.8, name: "temple_right" },
      { offset: new Vector3(-0.02, 0.005, 0), priority: 0.8, name: "temple_left" },
      { offset: new Vector3(0, 0.025, 0), priority: 0.7, name: "crown" },
      { offset: new Vector3(0.015, -0.01, 0), priority: 0.6, name: "cheek_right" },
      { offset: new Vector3(-0.015, -0.01, 0), priority: 0.6, name: "cheek_left" },
      { offset: new Vector3(0, -0.02, 0), priority: 0.5, name: "chin" },
    ];
    return points.sort((a, b) => b.priority - a.priority);
  }

  updateVelocityHistory(newVelocity) {
    this.velocityBuffer.push(newVelocity.clone());
    if (this.velocityBuffer.length > this.maxVelocityHistory) {
      this.velocityBuffer.shift();
    }
  }

  getSmoothedVelocity() {
    if (this.velocityBuffer.length === 0) return Vector3.zero();
    const sum = new Vector3();
    for (const v of this.velocityBuffer) sum.addInPlace(v);
    return sum.multiplyScalar(1 / this.velocityBuffer.length);
  }

  predictTargetPositionAdvanced(startPos, velocity, distance, travelTime) {
    const result = this.tempVec1;
    result.copyFrom(startPos).addInPlace(velocity.clone().multiplyScalar(travelTime));

    if (this.gravity > 0) {
      result.y -= 0.5 * this.gravity * travelTime * travelTime;
    }

    if (this.windResistance > 0) {
      const drag = this.windResistance * travelTime;
      result.addInPlace(velocity.clone().multiplyScalar(-drag));
    }

    return result;
  }

  isValidTarget(snapPoint, playerPos) {
    if (!snapPoint || !playerPos) return false;

    const distSq = playerPos.distanceSquaredTo(snapPoint);
    if (distSq > 500 * 500 || distSq < 1) return false;

    const dir = snapPoint.subtract(playerPos).normalize();
    const forward = new Vector3(0, 0, 1);
    const dot = dir.dot(forward);
    return dot > 0.5; // tương đương <60 độ
  }

  findOptimalSnapPoint(headCenter, velocity, playerPos) {
    let bestPoint = null;
    let bestScore = -1;

    const smoothedVel = this.getSmoothedVelocity();

    for (const snapData of this.snapPoints) {
      const snapWorldPos = headCenter.add(snapData.offset);
      if (!this.isValidTarget(snapWorldPos, playerPos)) continue;

      const distance = playerPos.distanceTo(snapWorldPos);
      const travelTime = Math.min(distance / this.bulletSpeed, this.maxPredictionTime);

      const predicted = this.predictTargetPositionAdvanced(snapWorldPos, smoothedVel, distance, travelTime);

      const distanceScore = 1 / (1 + distance * 0.01);
      const priorityScore = snapData.priority;
      const stabilityScore = this.calculateStabilityScore(predicted);

      const total = distanceScore * priorityScore * stabilityScore;

      if (total > bestScore) {
        bestScore = total;
        bestPoint = predicted.clone();
        bestPoint.snapName = snapData.name;
      }
    }

    return bestPoint;
  }

  calculateStabilityScore(point) {
    const dist = point.distanceTo(this.lastBestPoint);
    return dist < this.aimStabilityThreshold ? 1.2 : 1.0;
  }

  smoothAimTransition(current, target, deltaTime) {
    const factor = Math.min(deltaTime * 8.0, 1.0);
    return new Vector3(
      current.x + (target.x - current.x) * factor,
      current.y + (target.y - current.y) * factor,
      current.z + (target.z - current.z) * factor
    );
  }

  update(playerPos, headCenter, headVelocity, deltaTime = 0.016) {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = now;

    this.updateVelocityHistory(headVelocity);

    const optimal = this.findOptimalSnapPoint(headCenter, headVelocity, playerPos);
    if (!optimal) return;

    const smooth = this.smoothAimTransition(this.lastBestPoint, optimal, deltaTime);
    this.lastBestPoint.copyFrom(smooth);
    this.setAimTo(smooth, optimal.snapName);
  }

  updateMultipleTargets(playerPos, targets, deltaTime = 0.016) {
    let best = null, bestScore = -1;

    for (const t of targets) {
      const snap = this.findOptimalSnapPoint(t.headCenter, t.velocity, playerPos);
      if (snap) {
        const score = 1 / (1 + playerPos.distanceTo(snap) * 0.01) * t.priority;
        if (score > bestScore) {
          best = { point: snap, target: t };
          bestScore = score;
        }
      }
    }

    if (best) {
      this.setAimTo(best.point, best.target.name);
    }
  }

  setAimTo(vec3, name = "unknown") {
    console.log(`🎯 [${name}] Aim: X=${vec3.x.toFixed(3)} Y=${vec3.y.toFixed(3)} Z=${vec3.z.toFixed(3)}`);
    // GameAPI.setAim(vec3.x, vec3.y, vec3.z); // nếu có
  }

  getStats() {
    return {
      bulletSpeed: this.bulletSpeed,
      snapPoints: this.snapPoints.length,
      velocityHistory: this.velocityBuffer.length,
      lastAim: this.lastBestPoint.clone(),
      updateRate: 1000 / this.updateInterval
    };
  }
}

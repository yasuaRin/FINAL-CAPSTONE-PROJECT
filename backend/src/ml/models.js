// models.js - ES Module version

export class RobustScaler {
  constructor() {
    this.medians = null;
    this.iqrs = null;
  }

  fit(X) {
    const n = X.length;
    const cols = X[0].length;
    this.medians = new Array(cols);
    this.iqrs = new Array(cols);

    for (let c = 0; c < cols; c++) {
      const col = X.map(row => row[c]).sort((a, b) => a - b);
      this.medians[c] = this._median(col);
      const q1 = this._percentile(col, 25);
      const q3 = this._percentile(col, 75);
      this.iqrs[c] = Math.max(q3 - q1, 1e-8);
    }
    return this;
  }

  transform(X) {
    return X.map(row =>
      row.map((val, c) => (val - this.medians[c]) / this.iqrs[c])
    );
  }

  fitTransform(X) {
    this.fit(X);
    return this.transform(X);
  }

  _median(sorted) {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  _percentile(sorted, p) {
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  toJSON() {
    return { medians: this.medians, iqrs: this.iqrs };
  }

  static fromJSON(json) {
    const scaler = new RobustScaler();
    scaler.medians = json.medians;
    scaler.iqrs = json.iqrs;
    return scaler;
  }
}


export class RidgeRegression {
  constructor(lambdaVal = 1.0) {
    this.lambdaVal = lambdaVal;
    this.theta = null;
  }

  fit(X, y) {
    const n = X.length;
    const m = X[0].length;

    // XtX = X^T @ X
    const XtX = this._matMul(this._transpose(X), X);

    // XtX + lambda * I
    for (let i = 0; i < m; i++) XtX[i][i] += this.lambdaVal;

    // Xty = X^T @ y
    const Xty = this._transpose(X).map(row =>
      row.reduce((sum, val, i) => sum + val * y[i], 0)
    );

    this.theta = this._matVecSolve(XtX, Xty);
    return this;
  }

  predict(X) {
    const rows = Array.isArray(X[0]) ? X : [X];
    return rows.map(row =>
      row.reduce((sum, val, i) => sum + val * this.theta[i], 0)
    );
  }

  _transpose(M) {
    return M[0].map((_, c) => M.map(row => row[c]));
  }

  _matMul(A, B) {
    return A.map(rowA =>
      B[0].map((_, c) => rowA.reduce((sum, val, k) => sum + val * B[k][c], 0))
    );
  }

  _matVecSolve(A, b) {
    // Gaussian elimination
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++)
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
      [M[col], M[maxRow]] = [M[maxRow], M[col]];

      for (let row = col + 1; row < n; row++) {
        const factor = M[row][col] / M[col][col];
        for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n] / M[i][i];
      for (let k = i - 1; k >= 0; k--) M[k][n] -= M[k][i] * x[i];
    }
    return x;
  }

  toJSON() {
    return { lambda: this.lambdaVal, theta: this.theta };
  }

  static fromJSON(json) {
    const model = new RidgeRegression(json.lambda);
    model.theta = json.theta;
    return model;
  }
}


export class RFRegressor {
  constructor(options = {}) {
    this.options = { nEstimators: 100, seed: 42, ...options };
    this.trees = null;
  }

  fit(X, y) {
    this.trees = [];
    const n = X.length;
    const rng = this._seededRandom(this.options.seed);

    for (let t = 0; t < this.options.nEstimators; t++) {
      // Bootstrap sample
      const indices = Array.from({ length: n }, () => Math.floor(rng() * n));
      const Xb = indices.map(i => X[i]);
      const yb = indices.map(i => y[i]);
      const tree = this._buildTree(Xb, yb, rng);
      this.trees.push(tree);
    }
    return this;
  }

  predict(X) {
    const rows = Array.isArray(X[0]) ? X : [X];
    return rows.map(row => {
      const preds = this.trees.map(tree => this._predictTree(tree, row));
      return preds.reduce((a, b) => a + b, 0) / preds.length;
    });
  }

  _seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  _buildTree(X, y, rng, depth = 0, maxDepth = 10, minSamples = 2) {
    if (y.length <= minSamples || depth >= maxDepth) {
      return { leaf: true, value: y.reduce((a, b) => a + b, 0) / y.length };
    }

    const nFeatures = X[0].length;
    const sqrtFeatures = Math.max(1, Math.round(Math.sqrt(nFeatures)));
    const featureIdxs = this._sample(nFeatures, sqrtFeatures, rng);

    let bestFeature = -1, bestThreshold = 0, bestGain = -Infinity;

    for (const fi of featureIdxs) {
      const values = [...new Set(X.map(row => row[fi]))].sort((a, b) => a - b);
      for (let vi = 0; vi < values.length - 1; vi++) {
        const threshold = (values[vi] + values[vi + 1]) / 2;
        const gain = this._varianceReduction(X, y, fi, threshold);
        if (gain > bestGain) { bestGain = gain; bestFeature = fi; bestThreshold = threshold; }
      }
    }

    if (bestFeature === -1) {
      return { leaf: true, value: y.reduce((a, b) => a + b, 0) / y.length };
    }

    const leftIdx = X.map((_, i) => i).filter(i => X[i][bestFeature] <= bestThreshold);
    const rightIdx = X.map((_, i) => i).filter(i => X[i][bestFeature] > bestThreshold);

    if (leftIdx.length === 0 || rightIdx.length === 0) {
      return { leaf: true, value: y.reduce((a, b) => a + b, 0) / y.length };
    }

    return {
      leaf: false,
      feature: bestFeature,
      threshold: bestThreshold,
      left: this._buildTree(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), rng, depth + 1, maxDepth, minSamples),
      right: this._buildTree(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), rng, depth + 1, maxDepth, minSamples),
    };
  }

  _varianceReduction(X, y, fi, threshold) {
    const leftY = y.filter((_, i) => X[i][fi] <= threshold);
    const rightY = y.filter((_, i) => X[i][fi] > threshold);
    if (leftY.length === 0 || rightY.length === 0) return -Infinity;
    const varAll = this._variance(y);
    const varLeft = this._variance(leftY);
    const varRight = this._variance(rightY);
    return varAll - (leftY.length / y.length) * varLeft - (rightY.length / y.length) * varRight;
  }

  _variance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  }

  _sample(total, k, rng) {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, k);
  }

  _predictTree(node, row) {
    if (node.leaf) return node.value;
    return row[node.feature] <= node.threshold
      ? this._predictTree(node.left, row)
      : this._predictTree(node.right, row);
  }

  toJSON() {
    return { options: this.options, trees: this.trees };
  }

  static fromJSON(json) {
    const model = new RFRegressor(json.options);
    model.trees = json.trees;
    return model;
  }
}


export function mae(actual, predicted) {
  return actual.reduce((sum, a, i) => sum + Math.abs(a - predicted[i]), 0) / actual.length;
}

export function r2(actual, predicted) {
  const meanActual = actual.reduce((a, b) => a + b, 0) / actual.length;
  const ssTot = actual.reduce((s, a) => s + (a - meanActual) ** 2, 0);
  const ssRes = actual.reduce((s, a, i) => s + (a - predicted[i]) ** 2, 0);
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

export function mape(actual, predicted) {
  const pairs = actual.map((a, i) => [a, predicted[i]]).filter(([a]) => a > 0);
  if (pairs.length === 0) return 999.0;
  return (pairs.reduce((s, [a, p]) => s + Math.abs((a - p) / a), 0) / pairs.length) * 100;
}
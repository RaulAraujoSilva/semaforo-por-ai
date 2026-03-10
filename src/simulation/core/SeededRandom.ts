// Mulberry32 PRNG - deterministic random with seed
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }

  clone(): SeededRandom {
    const c = new SeededRandom(0)
    c.state = this.state
    return c
  }
}

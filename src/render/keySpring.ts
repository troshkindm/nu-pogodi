export interface Spring {
  position: number;
  velocity: number;
  target: number;
}

export const KEY_SPRING = {
  press: { stiffness: 7000, damping: 142 },
  release: { stiffness: 620, damping: 27 },
};

const SUBSTEP = 1 / 480;
const MAX_STEP = 1 / 20;
const SETTLED = { position: 0.002, velocity: 0.02 };

export const createSpring = (): Spring => ({ position: 0, velocity: 0, target: 0 });

export const isSettled = ({ position, velocity, target }: Spring) =>
  Math.abs(target - position) < SETTLED.position && Math.abs(velocity) < SETTLED.velocity;

export function stepSpring(spring: Spring, seconds: number): Spring {
  const { stiffness, damping } = spring.target > 0.5 ? KEY_SPRING.press : KEY_SPRING.release;
  let { position, velocity } = spring;
  let left = Math.min(seconds, MAX_STEP);
  while (left > 0) {
    const dt = Math.min(SUBSTEP, left);
    velocity += (stiffness * (spring.target - position) - damping * velocity) * dt;
    position += velocity * dt;
    left -= dt;
  }
  const next = { position, velocity, target: spring.target };
  return isSettled(next) ? { position: spring.target, velocity: 0, target: spring.target } : next;
}

export const random = (from: number, to: number) => {
  const finalTo = to - from;

  return Math.floor(Math.random() * finalTo) + from;
};

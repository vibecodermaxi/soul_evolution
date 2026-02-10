function timestamp(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8); // HH:MM:SS
}

export const log = {
  info(msg: string): void {
    console.log(`${timestamp()} [INFO] ${msg}`);
  },
  warning(msg: string): void {
    console.warn(`${timestamp()} [WARNING] ${msg}`);
  },
  error(msg: string): void {
    console.error(`${timestamp()} [ERROR] ${msg}`);
  },
};

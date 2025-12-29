declare module 'ffprobe-static' {
  const ffprobeStatic: string | { path?: string; default?: string | { path?: string } };
  export default ffprobeStatic;
}


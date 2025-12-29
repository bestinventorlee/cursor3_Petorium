declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    input(input: string | number): FfmpegCommand;
    output(output: string): FfmpegCommand;
    videoCodec(codec: string): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    videoBitrate(bitrate: string | number): FfmpegCommand;
    audioBitrate(bitrate: string | number): FfmpegCommand;
    size(size: string): FfmpegCommand;
    format(format: string): FfmpegCommand;
    outputOptions(options: string | string[]): FfmpegCommand;
    addOption(option: string, value?: string): FfmpegCommand;
    seekInput(time: string | number): FfmpegCommand;
    frames(count: number): FfmpegCommand;
    setFfmpegPath(path: string): FfmpegCommand;
    setFfprobePath(path: string): FfmpegCommand;
    on(event: string, callback: (data?: any) => void): FfmpegCommand;
    run(): FfmpegCommand;
    ffprobe(callback: (err: Error | null, data: any) => void): void;
    [key: string]: any; // Allow any additional methods
  }

  function ffmpeg(input?: string | number): FfmpegCommand;
  
  namespace ffmpeg {
    function ffprobe(input: string, callback: (err: Error | null, data: any) => void): void;
    function setFfmpegPath(path: string): void;
    function setFfprobePath(path: string): void;
  }
  
  export = ffmpeg;
}


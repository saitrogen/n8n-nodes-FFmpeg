export interface FFmpegTemplate {
  name: string;
  description: string;
  arguments: string;
  inputSchema?: { // Optional schema for input validation
    [key: string]: {
      type: string;
      validation?: string; // Regex for validation
      description?: string;
      options?: { name: string; value: any }[]; // For dropdowns
    };
  };
}

export const ffmpegTemplates: FFmpegTemplate[] = [
  {
    name: 'Basic Merge',
    description: 'Merges multiple video files with default settings.',
    arguments: '-f concat -safe 0 -i "{input}" -c:v libx264 -c:a aac "{output}"',
    inputSchema: {
      outputFileName: {
        type: 'string',
        description: 'Output file name',
      },
    },
  },
  {
    name: 'Overlay Text',
    description: 'Adds text overlay to a video.',
    arguments: '-i "{input}" -vf "drawtext=text=\'{text}\':fontfile=\'{fontfile}\':fontsize={fontsize}:fontcolor={fontcolor}:x={x}:y={y}" "{output}"',
    inputSchema: {
      text: {
        type: 'string',
        description: 'Text to overlay',
      },
      fontfile: {
        type: 'string',
        description: 'Path to the font file',
      },
      fontsize: {
        type: 'number',
        description: 'Font size',
      },
      fontcolor: {
        type: 'string',
        description: 'Font color (e.g., white, #000000)',
      },
      x: {
        type: 'string',
        description: 'X offset',
      },
      y: {
        type: 'string',
        description: 'Y offset',
      },
      outputFileName: {
        type: 'string',
        description: 'Output file name',
      },
    },
  },
  // Add more templates here
];

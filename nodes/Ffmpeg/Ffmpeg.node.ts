import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import * as merge from './action/merge.operation';
import * as overlay from './action/overlay.operation';
import * as info from './action/info.operation';
import * as custom from './action/custom.operation';
// Fix: Remove unused FFmpegTemplate import
import { ffmpegTemplates } from './templates';  // Removed FFmpegTemplate

export class Ffmpeg implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'FFmpeg',
        name: 'ffmpeg',
        icon: { light: 'file:ffmpeg.light.svg', dark: 'file:ffmpeg.dark.svg' },
        group: ['input'],
        version: 1,
        subtitle: 'Merge videos using FFMPEG',
        description: 'Merge multiple video files using FFmpeg',
        defaults: {
            name: 'FFMPEG',
        },
        inputs: ['main'] as NodeConnectionType[],
        outputs: ['main'] as NodeConnectionType[],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    { name: 'Merge Videos', value: 'merge' },
                    { name: 'Overlay Audio', value: 'overlay' },
                    { name: 'Info', value: 'info' },
                    { name: 'Custom Command', value: 'custom' },
                ],
                default: 'merge',
                noDataExpression: true,
                description: 'Choose operation: Merge multiple videos or run a custom FFmpeg command',
            },
            {
                displayName: 'Template',
                name: 'template',
                type: 'options',
                options: ffmpegTemplates.map(template => ({
                    name: template.name,
                    value: template.name,
                    description: template.description,
                })),
                default: '',
                description: 'Select a predefined template',
            },
            {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                default: '',
                description: 'Text to overlay',
                displayOptions: {
                    show: {
                        template: ['Overlay Text'],
                    },
                },
            },
            {
                displayName: 'Font File',
                name: 'fontFile',
                type: 'string',
                default: '',
                description: 'Path to the font file',
                displayOptions: {
                    show: {
                        template: ['Overlay Text'],
                    },
                },
            },
            {
                displayName: 'Font Size',
                name: 'fontSize',
                type: 'number',
                default: 24,
                description: 'Font size',
                displayOptions: {
                    show: {
                        template: ['Overlay Text'],
                    },
                },
            },
            {
                displayName: 'Font Color',
                name: 'fontColor',
                type: 'color',
                default: 'white',
                description: 'Font color (e.g., white, #000000)',
                displayOptions: {
                    show: {
                        template: ['Overlay Text'],
                    },
                },
            },
            {
                displayName: 'X Offset',
                name: 'xOffset',
                type: 'string',
                default: '10',
                description: 'X offset',
                displayOptions: {
                    show: {
                        template: ['Overlay Text'],
                    },
                },
            },
            {
                displayName: 'Y Offset',
                name: 'yOffset',
                type: 'string',
                default: '10',
                description: 'Y offset',
                displayOptions: {
                    show: {
                        template: ['Overlay Text'],
                    },
                },
            },
            {
                displayName: 'Minimum Files to Merge',
                name: 'minFiles',
                type: 'number',
                default: 2,
                required: true,
                description: 'Minimum files to merge',
                displayOptions: {
                    show: {
                        operation: ['merge'],
                    },
                },
            },
            {
                displayName: 'Output File Name',
                name: 'outputFileName',
                type: 'string',
                default: 'merged_video.mp4',
                required: true,
                description: 'Output file name',
                displayOptions: {
                    show: {
                        operation: ['merge', 'overlay', 'custom'],
                    },
                },

            },
            {
                displayName: 'Output Binary Property',
                name: 'outputBinary',
                type: 'string',
                default: 'mergedVideo',
                required: true,
                description: 'Output binary property',
                displayOptions: {
                    show: {
                        operation: ['merge', 'overlay', 'custom'],
                    },
                },

            },
            {
                displayName: 'FFmpeg Merge Arguments',
                name: 'ffmpegMergeArgs',
                type: 'string',
                default: '-f concat -safe 0 -i "{input}" -c:v libx264 -c:a aac "{output}"',
                description: 'Custom FFmpeg command. Use {input} for concat file and {output} for output file.',
                displayOptions: {
                    show: {
                        operation: ['merge'],
                    },
                },

            },
            {
                displayName: 'FFmpeg Overlay Arguments',
                name: 'ffmpegOverlayArgs',
                type: 'string',
                default: '-i "{video}" -i "{audio}" -c:v copy -c:a aac "{output}"',
                description: 'Шаблон FFmpeg: {video}, {audio}, {output}',
                displayOptions: {
                    show: {
                        operation: ['overlay'],
                    },
                },
            },
            {
                displayName: 'Custom FFmpeg Command',
                name: 'ffmpegCustomArgs',
                type: 'string',
                default: '-i "{input}" -vf "transpose=1" "{output}"',
                description: 'Enter your FFmpeg command. Use {input} for the input file and {output} for the output file.',
                displayOptions: {
                    show: {
                        operation: ['custom'],
                    },
                },
            },
            {
                displayName: 'Video Codec',
                name: 'videoCodec',
                type: 'options',
                options: [
                    { name: 'libx264', value: 'libx264' },
                    { name: 'libx265', value: 'libx265' },
                    { name: 'copy', value: 'copy' },
                ],
                default: 'libx264',
                description: 'Video Codec',
                displayOptions: {
                    show: {
                        operation: ['merge', 'overlay', 'custom'],
                    },
                },
            },
            {
                displayName: 'Audio Codec',
                name: 'audioCodec',
                type: 'options',
                options: [
                    { name: 'aac', value: 'aac' },
                    { name: 'mp3', value: 'mp3' },
                    { name: 'copy', value: 'copy' },
                ],
                default: 'aac',
                description: 'Audio Codec',
                displayOptions: {
                    show: {
                        operation: ['merge', 'overlay', 'custom'],
                    },
                },
            },
            {
                displayName: 'Resolution',
                name: 'resolution',
                type: 'string',
                default: '1920x1080',
                description: 'Set the video resolution (e.g., 1920x1080)',
                displayOptions: {
                    show: {
                        operation: ['merge', 'overlay', 'custom'],
                    },
                },
            },
            {
                displayName: 'Video Bitrate (Kbps)',
                name: 'videoBitrate',
                type: 'number',
                default: 2000,
                description: 'Set the video bitrate in kilobits per second',
                displayOptions: {
                    show: {
                        operation: ['merge', 'overlay', 'custom'],
                    },
                },
            },
            {
                displayName: 'Frame Rate (Fps)',
                name: 'frameRate',
                type: 'number',
                default: 30,
                description: 'Set the video frame rate',
                displayOptions: {
                    show: {
                        operation: ['merge', 'overlay', 'custom'],
                    },
                },
            },
            {
                displayName: 'Execution Mode',
                name: 'executionMode',
                type: 'options',
                options: [
                    { name: 'Execute', value: 'execute' },
                    { name: 'Output Command', value: 'output' },
                ],
                default: 'execute',
                description: 'Choose whether to execute the command or output it',
            },
        ],
    };

    async execute(this: IExecuteFunctions) {
        const operation = this.getNodeParameter('operation', 0, 'merge');
        const items = this.getInputData();
        let returnData: INodeExecutionData[] = [];

        if (operation === 'merge') {
            returnData = await merge.execute.call(this, items);
        }
        if (operation === 'overlay') {
            returnData = await overlay.execute.call(this, items);
        }
        if (operation === 'info') {
            returnData = await info.execute.call(this, items);
        }

        if (operation === 'custom') {
            returnData = await custom.execute.call(this, items);
        }

        return [returnData];
    }
}

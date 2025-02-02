import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import * as merge from './action/merge.operation';
import * as overlay from './action/overlay.operation';
import * as info from './action/info.operation';
import * as custom from './action/custom.operation';

export class Ffmpeg implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Ffmpeg',
        name: 'ffmpeg',
        icon: { light: 'file:ffmpeg.light.svg', dark: 'file:ffmpeg.dark.svg' },
        group: ['input'],
        version: 1,
        subtitle: 'Merge videos using FFMPEG',
        description: 'Merge multiple video files using FFmpeg.',


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
                displayName: 'Minimum Files to Merge',
                name: 'minFiles',
                type: 'number',
                default: 2,
                required: true,
                description: 'Minimum number of files required before merging',
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
                description: 'Name of the output video file',
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
                description: 'Name of the output binary property',
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

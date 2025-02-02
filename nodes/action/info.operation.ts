import type {
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as childProcess from 'child_process';

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {

	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item.binary) continue;

		const binaryKeys = Object.keys(item.binary);
		if (!binaryKeys.length) continue;

		const binaryKey = binaryKeys[0];
		const binaryData = item.binary[binaryKey];
		if (!binaryData?.data) continue;

		const extension = path.extname(binaryData.fileName || '') || '.mp4';
		const tempFilePath = path.join(
			os.tmpdir(),
			`ffinfo_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`
		);
		fs.writeFileSync(tempFilePath, Buffer.from(binaryData.data, 'base64'));

		const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${tempFilePath}"`;
		let ffprobeOutput: string;
		try {
			ffprobeOutput = childProcess.execSync(cmd, { encoding: 'utf-8' });
		} catch (error) {
			if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
			throw new Error(`FFprobe error: ${error}`);
		}

		fs.unlinkSync(tempFilePath);

		let info: any;
		try {
			info = JSON.parse(ffprobeOutput);
		} catch (parseError) {
			throw new Error(`Could not parse ffprobe JSON output: ${parseError}`);
		}

		const formatBlock = info.format || {};
		const durationStr = formatBlock.duration || '0';
		const duration = parseFloat(durationStr);
		const sizeStr = formatBlock.size || '0';
		const size = parseInt(sizeStr, 10);
		const bitRateStr = formatBlock.bit_rate || '0';
		const bitRate = parseInt(bitRateStr, 10);
		const formatName = formatBlock.format_name || 'unknown';

		let streams = [];
		if (Array.isArray(info.streams)) {
			streams = info.streams.map((stream: any) => ({
				index: stream.index,
				codec_type: stream.codec_type,
				codec_name: stream.codec_name,
				width: stream.width || null,
				height: stream.height || null,
				sample_rate: stream.sample_rate || null,

				channels: stream.channels || null,
				bit_rate: stream.bit_rate || null,
				duration: stream.duration || null,
			}));
		}

		returnData.push({
			json: {
				fileName: binaryData.fileName,
				formatName,
				duration,
				size,
				bitRate,
				streams,
			},
			pairedItem: { item: i },
		});
	}

	return returnData;
}

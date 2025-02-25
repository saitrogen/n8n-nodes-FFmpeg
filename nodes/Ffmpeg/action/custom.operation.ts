import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as childProcess from 'child_process';

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	// Читаем параметры
	const ffmpegCustomArgs = this.getNodeParameter('ffmpegCustomArgs', 0) as string;
	const outputFileName = this.getNodeParameter('outputFileName', 0) as string;
	const outputBinary = this.getNodeParameter('outputBinary', 0) as string;

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item.binary) {
			continue;
		}

		const [binaryKey] = Object.keys(item.binary);
		if (!binaryKey) {
			continue;
		}

		const binaryData = item.binary[binaryKey];
		if (!binaryData?.data) {
			continue;
		}

		const extension = path.extname(binaryData.fileName || '') || '.mp4';
		const tempInputFilePath = path.join(
			os.tmpdir(),
			`ffcustom_in_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`,
		);
		fs.writeFileSync(tempInputFilePath, Buffer.from(binaryData.data, 'base64'));

		const tempOutputFilePath = path.join(
			os.tmpdir(),
			`ffcustom_out_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`,
		);

		const cmd = ffmpegCustomArgs
			.replace('{input}', `"${tempInputFilePath}"`)
			.replace('{output}', `"${tempOutputFilePath}"`);

		// Add this BEFORE the try block:
		let stderrOutput = ''; // ✅ Declare here

		try {
			const ffmpegProcess = childProcess.spawn('ffmpeg', cmd.split(' '), {
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			ffmpegProcess.stderr.on('data', (data) => {
				stderrOutput += data.toString(); // ✅ Now accessible
			});
		} catch (error) {
			throw new Error(`FFmpeg custom command failed: ${error}. Stderr: ${stderrOutput}`);
		}

		try {
			const ffmpegProcess = childProcess.spawn('ffmpeg', cmd.split(' '), {
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			let stderrOutput = '';
			ffmpegProcess.stderr.on('data', (data) => {
				stderrOutput += data.toString();
			});
			ffmpegProcess.on('close', (code) => {
				if (code !== 0) {
					[tempInputFilePath, tempOutputFilePath].forEach(
						(f) => fs.existsSync(f) && fs.unlinkSync(f),
					);
					throw new Error(
						`FFmpeg custom command failed with code ${code}. Stderr: ${stderrOutput}`,
					);
				}
			});
			ffmpegProcess.on('error', (error) => {
				[tempInputFilePath, tempOutputFilePath].forEach(
					(f) => fs.existsSync(f) && fs.unlinkSync(f),
				);
				throw new Error(`FFmpeg custom command failed: ${error.message}. Stderr: ${stderrOutput}`);
			});
		} catch (error) {
			[tempInputFilePath, tempOutputFilePath].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
			if (fs.existsSync(tempOutputFilePath)) fs.unlinkSync(tempOutputFilePath);
			throw new Error(`FFmpeg custom command failed: ${error}. Stderr: ${stderrOutput}`);
		}

		const outputData = fs.readFileSync(tempOutputFilePath);
		const fileSize = fs.statSync(tempOutputFilePath).size;

		returnData.push({
			json: {
				success: true,
				fileSize,
			},
			binary: {
				[outputBinary]: {
					data: outputData.toString('base64'),
					mimeType: 'video/mp4',
					fileName: outputFileName,
					fileSize: fileSize.toString(),
				},
			},
			pairedItem: {
				item: i,
			},
		});

		[tempInputFilePath, tempOutputFilePath].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
	}

	return returnData;
}

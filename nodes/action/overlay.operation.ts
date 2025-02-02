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
	const tempDir = os.tmpdir();
	const staticData = this.getWorkflowStaticData('node');
	const outputFileName = this.getNodeParameter('outputFileName', 0) as string;
	const outputBinary = this.getNodeParameter('outputBinary', 0) as string;
	const ffmpegArgs = this.getNodeParameter('ffmpegOverlayArgs', 0) as string;

	let storedFiles: string[] = (staticData.overlayFiles as string[]) || [];
	storedFiles = storedFiles.filter(filePath => fs.existsSync(filePath));

	for (let i = 0; i < items.length; i++) {
		const binaryDataObj = items[i].binary;
		if (!binaryDataObj) continue;

		for (const binaryKey in binaryDataObj) {
			if (!binaryKey || !binaryDataObj[binaryKey]) continue;

			try {
				const binaryData = this.helpers.assertBinaryData(i, binaryKey);
				const extension = path.extname(binaryData.fileName || '') || '.mp4'; // на всякий случай
				const filePath = path.join(
					tempDir,
					`overlay_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`
				);
				fs.writeFileSync(filePath, Buffer.from(binaryData.data, 'base64'));
				storedFiles.push(filePath);
			} catch (error) {
				console.error('Error processing binary data:', error);
			}
		}
	}

	staticData.overlayFiles = storedFiles;

	if (storedFiles.length < 2) {
		console.log(`Waiting for more files. Current: ${storedFiles.length}, Need: 2`);
		return [];
	}

	const [videoPath, audioPath] = storedFiles;
	const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);

	const cmd = ffmpegArgs
		.replace('{video}', `"${videoPath}"`)
		.replace('{audio}', `"${audioPath}"`)
		.replace('{output}', `"${outputPath}"`);

	try {
		childProcess.execSync(`ffmpeg ${cmd}`, { stdio: 'ignore' });
	} catch (error) {
		storedFiles.forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
		if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
		staticData.overlayFiles = [];
		throw new Error(`FFmpeg overlay failed: ${error}`);
	}

	const mergedData = fs.readFileSync(outputPath);
	const fileSize = fs.statSync(outputPath).size;

	returnData.push({
		json: { success: true, fileSize },
		binary: {
			[outputBinary]: {
				data: mergedData.toString('base64'),
				mimeType: 'video/mp4',
				fileName: outputFileName,
				fileSize: fileSize.toString(),
			},
		},
	});

	[outputPath, ...storedFiles].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
	staticData.overlayFiles = [];

	return returnData;
}

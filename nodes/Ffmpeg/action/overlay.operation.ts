

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
	let ffmpegArgs = this.getNodeParameter('ffmpegOverlayArgs', 0) as string;
	const template = this.getNodeParameter('template', 0) as string; // ✅ Get template

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

	if (template === 'Overlay Text') {
		const text = this.getNodeParameter('text', 0) as string;
		const fontFile = this.getNodeParameter('fontFile', 0) as string;
		const fontSize = this.getNodeParameter('fontSize', 0) as number;
		const fontColor = this.getNodeParameter('fontColor', 0) as string;
		const xOffset = this.getNodeParameter('xOffset', 0) as string;
		const yOffset = this.getNodeParameter('yOffset', 0) as string;

		const drawTextFilter = `drawtext=text='${text}':fontfile='${fontFile}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${xOffset}:y=${yOffset}`;
		ffmpegArgs = `-i "${videoPath}" -vf "${drawTextFilter}" -i "${audioPath}" -c:v copy -c:a aac "${outputPath}"`;
	} else {
		ffmpegArgs = ffmpegArgs
			.replace('{video}', `"${videoPath}"`)
			.replace('{audio}', `"${audioPath}"`)
			.replace('{output}', `"${outputPath}"`);
	}



	let stderrOutput = '';
	try {
		const ffmpegProcess = childProcess.spawn('ffmpeg', ffmpegArgs.split(' '), { stdio: ['ignore', 'pipe', 'pipe'] });
		ffmpegProcess.stderr.on('data', (data) => {
			stderrOutput += data.toString();
		});
		ffmpegProcess.on('close', (code) => {
			if (code !== 0) {
				storedFiles.forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
				if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
				staticData.overlayFiles = [];
				throw new Error(`FFmpeg overlay failed with code ${code}. Stderr: ${stderrOutput}`);
			}
		});
		ffmpegProcess.on('error', (error) => {
			storedFiles.forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
			if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
			staticData.overlayFiles = [];
			throw new Error(`FFmpeg overlay failed: ${error.message}. Stderr: ${stderrOutput}`);
		});
	} catch (error) {
		storedFiles.forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
		if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
		staticData.overlayFiles = [];
		throw new Error(`FFmpeg overlay failed: ${error}. Stderr: ${stderrOutput}`);
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

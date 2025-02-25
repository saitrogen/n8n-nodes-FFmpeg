import type {
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as childProcess from 'child_process';
import * as shell from 'shell-quote';



export async function execute(
    this: IExecuteFunctions,
    items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
    try {
        const returnData: INodeExecutionData[] = [];
        const tempDir = os.tmpdir();
        const minFiles = this.getNodeParameter('minFiles', 0) as number;
        const outputFileName = this.getNodeParameter('outputFileName', 0) as string;
        const ffmpegMergeArgs = this.getNodeParameter('ffmpegMergeArgs', 0) as string;
        const isWindows = os.platform() === 'win32';

        const items = this.getInputData();

        if (!items || items.length === 0) {
            return returnData;
        }

        let storedFiles: string[] = (this.getWorkflowStaticData('node').files as string[]) || [];

        storedFiles = storedFiles.filter(file => {
            try {
                return fs.existsSync(file);
            } catch {
                return false;
            }
        });

        for (let i = 0; i < items.length; i++) {
            const binaryDataObj = items[i].binary;
            if (!binaryDataObj) continue;

            for (const binaryKey in binaryDataObj) {
                if (!binaryKey || !binaryDataObj[binaryKey]) continue;

                try {
                    const binaryData = this.helpers.assertBinaryData(i, binaryKey);
                    const inputPath = path.join(
                        tempDir,
                        `ffmpeg_merge_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`
                    );
                    fs.writeFileSync(inputPath, Buffer.from(binaryData.data, 'base64'));
                    storedFiles.push(inputPath);
                } catch (error) {
                    console.error('Error processing binary data:', error);
                }
            }
        }

        this.getWorkflowStaticData('node').files = storedFiles;

        if (storedFiles.length < minFiles) {
            console.log(`Waiting for more files. Current: ${storedFiles.length}, Required: ${minFiles}`);
            return [];
        }

        console.log(`Processing ${storedFiles.length} files`);

        const concatFilePath = path.join(tempDir, `concat_${Date.now()}.txt`);
        const concatFileContent = storedFiles.map((file) => {
            let normalizedPath = file;
            if (isWindows) {
                normalizedPath = file.replace(/\\/g, '/');
            }
            normalizedPath = normalizedPath.replace(/(['"])/g, '\\$1');
            return `file '${normalizedPath}'`;
        }).join('\n');

        fs.writeFileSync(concatFilePath, concatFileContent, 'utf8');

        const outputFilePath = path.join(
            tempDir,
            `output_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`
        );

        const videoCodec = this.getNodeParameter('videoCodec', 0) as string;
        const audioCodec = this.getNodeParameter('audioCodec', 0) as string;
        const resolution = this.getNodeParameter('resolution', 0) as string;
        const videoBitrate = this.getNodeParameter('videoBitrate', 0) as number;
        const frameRate = this.getNodeParameter('frameRate', 0) as number;

        let ffmpegCommand = ffmpegMergeArgs;

        if (videoCodec !== 'copy') {
            ffmpegCommand = `-c:v ${videoCodec} ${ffmpegCommand}`;
        }

        if (audioCodec !== 'copy') {
            ffmpegCommand = `-c:a ${audioCodec} ${ffmpegCommand}`;
        }

        if (resolution) {
            ffmpegCommand = `-s ${resolution} ${ffmpegCommand}`;
        }

        if (videoBitrate) {
            ffmpegCommand = `-b:v ${videoBitrate}k ${ffmpegCommand}`;
        }

        if (frameRate) {
            ffmpegCommand = `-r ${frameRate} ${ffmpegCommand}`;
        }

        ffmpegCommand = ` -progress pipe:1 ${ffmpegCommand}`;

        const escapedConcatFilePath = shell.quote([concatFilePath]);
        const escapedOutputFilePath = shell.quote([outputFilePath]);

        ffmpegCommand = ffmpegCommand.replace('{input}', escapedConcatFilePath).replace('{output}', escapedOutputFilePath);

        console.log("FFmpeg Command:", ffmpegCommand);

        const ffmpegProcess = childProcess.spawn('ffmpeg', ffmpegCommand.split(' '), {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });

        ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.log("FFmpeg stderr:", output);
            if (output.includes('frame=')) {
                const frameMatch = output.match(/frame=\s*(\d+)/);
                if (frameMatch) {
                    //const currentFrame = parseInt(frameMatch[1], 10);
                    //TODO: Calculate total frames
                    //this.emitProgress(progress);
                }
            }
        });

        let stderrOutput = '';
        ffmpegProcess.stderr.on('data', (data) => {
            stderrOutput += data.toString();
        });

        ffmpegProcess.on('close', (code) => {
            if (code !== 0) {
                this.getWorkflowStaticData('node').files = [];
                const errorMessage = `FFmpeg merge failed with code ${code}. Stderr: ${stderrOutput}`;
                throw new Error(errorMessage);
            }
        });

        ffmpegProcess.on('error', (error) => {
            this.getWorkflowStaticData('node').files = [];
            const errorMessage = `FFmpeg merge failed: ${error.message}. Stderr: ${stderrOutput}`;
            throw new Error(errorMessage);
        });

        const outputBinaryData = fs.readFileSync(outputFilePath);
        const fileSize = fs.statSync(outputFilePath).size;

        returnData.push({
            json: {
                success: true,
                fileCount: storedFiles.length,
                outputSize: fileSize,
            },
            binary: {
                [this.getNodeParameter('outputBinary', 0) as string]: {
                    data: outputBinaryData.toString('base64'),
                    mimeType: 'video/mp4',
                    fileName: outputFileName,
                    fileSize: fileSize.toString(),
                },
            },
        });

        const filesToDelete = [outputFilePath, concatFilePath, ...storedFiles];
        for (const file of filesToDelete) {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (error) {
                console.error(`Failed to delete temporary file ${file}:`, error);
            }
        }

        this.getWorkflowStaticData('node').files = [];

        return returnData;

    } catch (error) {
        this.getWorkflowStaticData('node').files = [];

        if (error instanceof Error) {
            throw new Error(`FFmpeg Merge Error: ${error.message}`);
        }
        throw error;
    }
}

# n8n-nodes-ffmpeg

This package contains an n8n node that allows you to work with FFmpeg for video and audio file processing.

## Installation

**Important**: Make sure FFmpeg is installed on your system.

## Operations

The node supports the following operations:

### 1. Merge Videos
- Combines multiple video files into one
- Configurable minimum number of files to merge
- Support for advanced encoding options (codec, bitrate, resolution, frame rate)
- Improved error handling with more informative messages
- Progress reporting during the merge process

### 2. Overlay Audio
- Overlays an audio track onto a video file
- Configurable encoding parameters

### 3. Media Info
- Get technical information about video/audio files
- Detailed information about streams, codecs, and metadata

### 4. Custom Command
- Execute arbitrary FFmpeg commands
- Full control over processing parameters

## Parameters

### Common Parameters
- **Operation**: Choose operation (merge/overlay/info/custom)
- **Output File Name**: Name of the output file
- **Output Binary Property**: Name of the output binary property

### Merge Parameters
- **Minimum Files to Merge**: Minimum number of files required before merging
- **Video Codec**: Select the video codec (e.g., libx264, libx265, copy)
- **Audio Codec**: Select the audio codec (e.g., aac, mp3, copy)
- **Resolution**: Set the video resolution (e.g., 1920x1080)
- **Video Bitrate (kbps)**: Set the video bitrate in kilobits per second
- **Frame Rate (fps)**: Set the video frame rate
- **FFmpeg Merge Arguments**: Command line arguments for merging.  Use {input} for the concat file and {output} for the output file.

### Overlay Parameters
- **FFmpeg Overlay Arguments**: Command template for audio overlay

### Custom Parameters
- **Custom FFmpeg Command**: Arbitrary FFmpeg command

## Usage Examples

### Merging Videos
```json
{
  "operation": "merge",
  "minFiles": 2,
  "outputFileName": "merged_video.mp4",
  "outputBinary": "mergedVideo",
  "videoCodec": "libx264",
  "audioCodec": "aac",
  "resolution": "1280x720",
  "videoBitrate": 1500,
  "frameRate": 25
}
```

### Overlaying Audio
```json
{
  "operation": "overlay",
  "outputFileName": "video_with_audio.mp4",
  "outputBinary": "videoWithAudio",
  "ffmpegOverlayArgs": "-i \"{video}\" -i \"{audio}\" -c:v copy -c:a aac \"{output}\""
}
```

## License

[MIT](LICENSE.md)

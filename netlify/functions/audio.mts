import { Context } from "@netlify/functions";
import { Client } from 'youtubei';
import ytdl from "@distube/ytdl-core";
import { Readable } from "node:stream"

const youtube = new Client();
const CACHE_DURATION = 3600;

function nodeStreamToWebStream(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
  });
}

export default async function(req: Request, context: Context): Response {
  console.time('total-execution');
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (req.method === 'OPTIONS') {
      return new Response('', {
        status: 204,
        headers: headers
      });
    }

    const theme = new URL(req.url).searchParams.get('theme');
    if (!theme) {
      return new Response(JSON.stringify({ error: 'Theme parameter is required' }), {
        status: 400,
        headers: headers
      });
    }

    console.time('youtube-search');
    const videos = await youtube.search(theme + ' ambient music', {
      type: 'video',
      duration: 'long'
    });
    console.timeEnd('youtube-search');

    console.time('video-filtering');
    const filteredVideos = videos.items.filter(video => {
      const durationInMinutes = video.duration / 60;
      return durationInMinutes > 10 && 
        (video.title.toLowerCase().includes('ambient') || 
          video.description?.toLowerCase().includes('ambient'));
    });
    console.timeEnd('video-filtering');

    if (filteredVideos.length === 0) {
      return new Response(JSON.stringify({ error: 'No suitable videos found' }), {
        status: 404,
        headers: headers
      });
    }

    const randomVideo = filteredVideos[Math.floor(Math.random() * filteredVideos.length)];

    console.time('get-video-info');
    const videoInfo = await ytdl.getInfo(
      `https://www.youtube.com/watch?v=${randomVideo.id}`,
    );
    console.timeEnd('get-video-info');

    console.time('stream-setup');
    const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'lowestaudio' });
    const stream = ytdl.downloadFromInfo(videoInfo, {
      format,
      dlChunkSize: 1024 * 1024 * 4,
      liveBuffer: 10000
    });
    console.timeEnd('stream-setup');

    console.timeEnd('total-execution');
    return new Response(
      nodeStreamToWebStream(stream),
      {
        status: 200,
        headers: {
          ...headers,
          'Cache-Control': `public, max-age=${CACHE_DURATION}`,
          'Content-Type': 'audio/mpeg',
        },
      });

  } catch (error) {
    console.timeEnd('total-execution');
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
      });
  }
}
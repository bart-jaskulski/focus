import { Context } from "@netlify/functions";
import { Soundcloud } from "soundcloud.ts";

const CACHE_DURATION = 3600;
const soundcloud = new Soundcloud();

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

    console.time('soundcloud-search');
    const tracks = await soundcloud.tracks.search({
      q: theme,
      "filter.duration": "long",
      "filter.genre_or_tag": "ambient"
    });

    console.log(`Found ${tracks.collection.length} tracks`);
    console.log(
      JSON.stringify(
        tracks.collection.map(({title, permalink_url}) => ({title, permalink_url}))));
    console.timeEnd('soundcloud-search');

    if (tracks.collection.length === 0) {
      return new Response(JSON.stringify({ error: 'No suitable tracks found' }), {
        status: 404,
        headers: headers
      });
    }

    const randomTrack = tracks.collection[Math.floor(Math.random() * tracks.collection.length)];

    console.time('stream-setup');
    const stream = await soundcloud.util.streamTrack(randomTrack.permalink_url);
    console.timeEnd('stream-setup');

    console.timeEnd('total-execution');
    return new Response(
      stream,
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